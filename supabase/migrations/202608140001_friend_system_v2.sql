begin;

alter table public.profiles
  add column last_seen_at timestamptz not null default now();

create or replace view public.party_roster
with (security_invoker = true)
as
select
  pm.party_id,
  pm.role,
  pm.joined_at,
  p.id,
  p.handle,
  p.display_name,
  p.character_class,
  p.appearance_id,
  p.level,
  p.weekly_xp,
  p.raid_contribution,
  p.status,
  p.created_at,
  p.updated_at,
  p.last_seen_at
from public.party_members pm
join public.profiles p on p.id = pm.user_id;

create or replace function public.sync_player_profile(
  requested_display_name text,
  requested_character_class text,
  requested_appearance_id text,
  requested_level integer,
  requested_progress_xp integer,
  requested_raid_contribution integer
)
returns public.profiles
language plpgsql
security definer set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  synced public.profiles;
  safe_name text := left(trim(coalesce(requested_display_name, '')), 24);
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if safe_name = '' then safe_name := 'Ascendant'; end if;
  if requested_character_class not in ('Warrior', 'Scholar', 'Monk', 'Ranger') then
    raise exception 'Unknown character class';
  end if;
  if requested_appearance_id not in ('violet', 'ember', 'frost') then
    raise exception 'Unknown appearance';
  end if;

  insert into public.profiles (
    id,
    handle,
    display_name,
    character_class,
    appearance_id,
    level,
    weekly_xp,
    raid_contribution,
    last_seen_at
  ) values (
    actor,
    'ascendant_' || substr(replace(actor::text, '-', ''), 1, 10),
    safe_name,
    requested_character_class,
    requested_appearance_id,
    greatest(1, least(coalesce(requested_level, 1), 999)),
    greatest(0, least(coalesce(requested_progress_xp, 0), 100000000)),
    greatest(0, least(coalesce(requested_raid_contribution, 0), 100000000)),
    now()
  )
  on conflict (id) do update set
    display_name = excluded.display_name,
    character_class = excluded.character_class,
    appearance_id = excluded.appearance_id,
    level = excluded.level,
    weekly_xp = excluded.weekly_xp,
    raid_contribution = excluded.raid_contribution,
    last_seen_at = excluded.last_seen_at
  returning * into synced;

  return synced;
end;
$$;

create or replace function public.heartbeat_player()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.profiles set last_seen_at = now() where id = auth.uid();
end;
$$;

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
  if target_user is null or target_user = actor then
    raise exception 'Choose another player';
  end if;
  if not exists (select 1 from public.profiles where id = target_user) then
    raise exception 'Player not found';
  end if;
  if private.is_friend(target_user, actor) then return 'friends'; end if;

  select * into reverse_request
  from public.friend_requests
  where sender_id = target_user
    and receiver_id = actor
    and status = 'pending'
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
  ) then
    return 'pending';
  end if;

  insert into public.friend_requests(sender_id, receiver_id)
  values (actor, target_user);
  return 'sent';
exception
  when unique_violation then return 'pending';
end;
$$;

create or replace function public.cancel_friend_request(request_id uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.friend_requests
  where id = request_id and sender_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Pending request not found'; end if;
end;
$$;

create or replace function public.remove_friend(target_user uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.friendships
  where user_low = least(auth.uid(), target_user)
    and user_high = greatest(auth.uid(), target_user);
  if not found then raise exception 'Friendship not found'; end if;
end;
$$;

revoke execute on function public.sync_player_profile(text, text, text, integer, integer, integer) from public, anon;
revoke execute on function public.heartbeat_player() from public, anon;
revoke execute on function public.search_players(text, integer) from public, anon;
revoke execute on function public.send_friend_request(uuid) from public, anon;
revoke execute on function public.cancel_friend_request(uuid) from public, anon;
revoke execute on function public.remove_friend(uuid) from public, anon;

grant execute on function public.sync_player_profile(text, text, text, integer, integer, integer) to authenticated;
grant execute on function public.heartbeat_player() to authenticated;
grant execute on function public.search_players(text, integer) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.cancel_friend_request(uuid) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;

alter publication supabase_realtime add table public.friendships;

commit;
