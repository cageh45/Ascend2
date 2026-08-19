begin;

create or replace function public.search_players(
  search_term text default '',
  result_limit integer default 20
)
returns setof public.profiles
language sql
stable
security definer set search_path = ''
as $$
  select p.*
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and not private.is_blocked_pair(auth.uid(), p.id)
    and (
      trim(coalesce(search_term, '')) = ''
      or p.handle ilike '%' || trim(search_term) || '%'
      or p.display_name ilike '%' || trim(search_term) || '%'
    )
    and not private.is_friend(p.id)
    and not exists (
      select 1
      from public.friend_requests fr
      where fr.status = 'pending'
        and least(fr.sender_id, fr.receiver_id) = least(auth.uid(), p.id)
        and greatest(fr.sender_id, fr.receiver_id) = greatest(auth.uid(), p.id)
    )
  order by
    case when lower(p.handle) = lower(trim(coalesce(search_term, ''))) then 0 else 1 end,
    p.last_seen_at desc,
    p.display_name
  limit greatest(1, least(coalesce(result_limit, 20), 30));
$$;

create or replace function public.send_friend_request(target_user uuid)
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  reverse_request public.friend_requests;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if target_user is null or target_user = actor then raise exception 'Choose another player'; end if;
  if not exists (select 1 from public.profiles where id = target_user) then raise exception 'Player not found'; end if;
  if private.is_blocked_pair(actor, target_user) then raise exception 'Player is unavailable'; end if;
  if private.is_friend(target_user, actor) then return 'friends'; end if;

  select * into reverse_request
  from public.friend_requests
  where sender_id = target_user and receiver_id = actor and status = 'pending'
  for update;
  if found then
    insert into public.friendships(user_low, user_high)
    values (least(actor, target_user), greatest(actor, target_user))
    on conflict do nothing;
    update public.friend_requests
    set status = 'accepted', responded_at = now()
    where id = reverse_request.id;
    return 'accepted';
  end if;

  if exists (
    select 1 from public.friend_requests
    where sender_id = actor and receiver_id = target_user and status = 'pending'
  ) then return 'pending'; end if;

  insert into public.friend_requests(sender_id, receiver_id)
  values (actor, target_user);
  return 'sent';
exception when unique_violation then return 'pending';
end;
$$;

create or replace function public.invite_friend_to_party(target_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_party uuid; new_invite uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select party_id into current_party from public.party_members
  where user_id = auth.uid() and role = 'leader';
  if current_party is null then raise exception 'Only a party leader can invite'; end if;
  if private.is_blocked_pair(auth.uid(), target_user) then raise exception 'Player is unavailable'; end if;
  if not private.is_friend(target_user) then raise exception 'Invitee must be your friend'; end if;
  if exists(select 1 from public.party_members where user_id = target_user) then raise exception 'Player is already in a party'; end if;

  insert into public.party_invites(party_id, invited_by, invited_user_id)
  values (current_party, auth.uid(), target_user)
  returning id into new_invite;
  return new_invite;
end;
$$;

commit;
