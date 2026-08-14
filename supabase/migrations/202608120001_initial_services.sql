begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public;

create type public.friend_request_status as enum ('pending', 'accepted', 'declined');
create type public.party_role as enum ('leader', 'member');
create type public.party_invite_status as enum ('pending', 'accepted', 'declined');
create type public.raid_state as enum ('lobby', 'active', 'victory', 'defeat', 'abandoned');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle = lower(handle) and handle ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null default 'Ascendant' check (char_length(display_name) between 1 and 24),
  character_class text not null default 'Warrior' check (character_class in ('Warrior', 'Scholar', 'Monk', 'Ranger')),
  appearance_id text not null default 'violet' check (appearance_id in ('violet', 'ember', 'frost')),
  level integer not null default 1 check (level between 1 and 999),
  weekly_xp integer not null default 0 check (weekly_xp >= 0),
  raid_contribution integer not null default 0 check (raid_contribution >= 0),
  status text not null default 'Ready to ascend' check (char_length(status) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  check (sender_id <> receiver_id)
);
create unique index friend_requests_pending_pair_idx
  on public.friend_requests (least(sender_id, receiver_id), greatest(sender_id, receiver_id))
  where status = 'pending';

create table public.friendships (
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high)
);
create index friendships_high_idx on public.friendships(user_high);

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 24),
  invite_code text not null unique default upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 8)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.party_members (
  party_id uuid not null references public.parties(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  role public.party_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (party_id, user_id)
);
create index party_members_party_idx on public.party_members(party_id);

create table public.party_invites (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  invited_user_id uuid not null references public.profiles(id) on delete cascade,
  status public.party_invite_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index party_invites_pending_user_idx
  on public.party_invites (party_id, invited_user_id)
  where status = 'pending';

create table public.party_messages (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 280),
  created_at timestamptz not null default now()
);
create index party_messages_party_created_idx on public.party_messages(party_id, created_at desc);

create table public.raid_sessions (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  dungeon_id text not null check (dungeon_id in ('ember-vault', 'verdant-court', 'tempest-depths', 'caldera-core', 'lunar-hunt', 'void-citadel')),
  state public.raid_state not null default 'lobby',
  host_id uuid not null references public.profiles(id) on delete cascade,
  boss_hp integer not null default 0 check (boss_hp >= 0),
  boss_max_hp integer not null default 0 check (boss_max_hp >= 0),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index one_open_raid_per_party_idx on public.raid_sessions(party_id)
  where state in ('lobby', 'active');

create table public.raid_participants (
  raid_session_id uuid not null references public.raid_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  ready boolean not null default false,
  connected boolean not null default false,
  damage integer not null default 0 check (damage >= 0),
  reported_outcome text check (reported_outcome in ('victory', 'defeat')),
  last_seen_at timestamptz not null default now(),
  primary key (raid_session_id, user_id)
);

create table public.raid_reward_claims (
  raid_session_id uuid not null references public.raid_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_xp integer not null check (reward_xp between 0 and 5000),
  claimed_at timestamptz not null default now(),
  primary key (raid_session_id, user_id)
);

create view public.party_roster
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
  p.updated_at
from public.party_members pm
join public.profiles p on p.id = pm.user_id;

create or replace function private.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger parties_set_updated_at before update on public.parties
for each row execute function private.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, handle, display_name)
  values (
    new.id,
    'ascendant_' || substr(replace(new.id::text, '-', ''), 1, 8),
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), 'Ascendant')
  );
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function private.is_friend(target_user uuid, actor_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships
    where (user_low = least(target_user, actor_user) and user_high = greatest(target_user, actor_user))
  );
$$;

create or replace function private.is_party_member(target_party uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.party_members
    where party_id = target_party and user_id = target_user
  );
$$;

create or replace function private.is_party_leader(target_party uuid, target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.party_members
    where party_id = target_party and user_id = target_user and role = 'leader'
  );
$$;

create or replace function private.party_id_from_topic(topic text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  if topic !~ '^party:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    return null;
  end if;
  return substring(topic from 7)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.parties enable row level security;
alter table public.party_members enable row level security;
alter table public.party_invites enable row level security;
alter table public.party_messages enable row level security;
alter table public.raid_sessions enable row level security;
alter table public.raid_participants enable row level security;
alter table public.raid_reward_claims enable row level security;

create policy profiles_read_authenticated on public.profiles for select to authenticated using (true);
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy friend_requests_read_participant on public.friend_requests for select to authenticated
  using (auth.uid() in (sender_id, receiver_id));
create policy friend_requests_send on public.friend_requests for insert to authenticated
  with check (
    sender_id = auth.uid()
    and status = 'pending'
    and responded_at is null
    and not private.is_friend(receiver_id)
  );

create policy friendships_read_member on public.friendships for select to authenticated
  using (auth.uid() in (user_low, user_high));
create policy friendships_delete_member on public.friendships for delete to authenticated
  using (auth.uid() in (user_low, user_high));

create policy parties_read_member on public.parties for select to authenticated
  using (
    private.is_party_member(id)
    or exists (
      select 1 from public.party_invites
      where party_id = id and invited_user_id = auth.uid() and status = 'pending'
    )
  );
create policy parties_update_leader on public.parties for update to authenticated
  using (private.is_party_leader(id)) with check (owner_id = auth.uid());
create policy parties_delete_leader on public.parties for delete to authenticated
  using (private.is_party_leader(id));

create policy party_members_read_member on public.party_members for select to authenticated
  using (private.is_party_member(party_id));
create policy party_invites_read_participant on public.party_invites for select to authenticated
  using (invited_user_id = auth.uid() or private.is_party_member(party_id));
create policy party_messages_read_member on public.party_messages for select to authenticated
  using (private.is_party_member(party_id));
create policy party_messages_send_member on public.party_messages for insert to authenticated
  with check (sender_id = auth.uid() and private.is_party_member(party_id));

create policy raid_sessions_read_member on public.raid_sessions for select to authenticated
  using (private.is_party_member(party_id));
create policy raid_participants_read_member on public.raid_participants for select to authenticated
  using (exists (
    select 1 from public.raid_sessions rs
    where rs.id = raid_session_id and private.is_party_member(rs.party_id)
  ));
create policy raid_rewards_read_self on public.raid_reward_claims for select to authenticated
  using (user_id = auth.uid());

create or replace function public.accept_friend_request(request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare request_row public.friend_requests;
begin
  select * into request_row from public.friend_requests
  where id = request_id and receiver_id = auth.uid() and status = 'pending'
  for update;
  if not found then raise exception 'Friend request not found'; end if;

  insert into public.friendships(user_low, user_high)
  values (least(request_row.sender_id, request_row.receiver_id), greatest(request_row.sender_id, request_row.receiver_id))
  on conflict do nothing;
  update public.friend_requests set status = 'accepted', responded_at = now() where id = request_id;
end;
$$;

create or replace function public.decline_friend_request(request_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.friend_requests
  set status = 'declined', responded_at = now()
  where id = request_id and receiver_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Friend request not found'; end if;
end;
$$;

create or replace function public.create_party_with_leader(party_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_party_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if exists(select 1 from public.party_members where user_id = auth.uid()) then
    raise exception 'Leave your current party first';
  end if;
  if char_length(trim(party_name)) not between 1 and 24 then raise exception 'Invalid party name'; end if;

  insert into public.parties(owner_id, name) values (auth.uid(), trim(party_name)) returning id into new_party_id;
  insert into public.party_members(party_id, user_id, role) values (new_party_id, auth.uid(), 'leader');
  return new_party_id;
end;
$$;

create or replace function public.invite_friend_to_party(target_user uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare current_party uuid; new_invite uuid;
begin
  select party_id into current_party from public.party_members
  where user_id = auth.uid() and role = 'leader';
  if current_party is null then raise exception 'Only a party leader can invite'; end if;
  if not private.is_friend(target_user) then raise exception 'Invitee must be your friend'; end if;
  if exists(select 1 from public.party_members where user_id = target_user) then raise exception 'Player is already in a party'; end if;

  insert into public.party_invites(party_id, invited_by, invited_user_id)
  values (current_party, auth.uid(), target_user)
  returning id into new_invite;
  return new_invite;
end;
$$;

create or replace function public.respond_party_invite(invite_id uuid, accept_invite boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare invite_row public.party_invites; member_count integer;
begin
  select * into invite_row from public.party_invites
  where id = invite_id and invited_user_id = auth.uid() and status = 'pending' for update;
  if not found then raise exception 'Party invite not found'; end if;

  if accept_invite then
    if exists(select 1 from public.party_members where user_id = auth.uid()) then raise exception 'Leave your current party first'; end if;
    perform 1 from public.parties where id = invite_row.party_id for update;
    select count(*) into member_count from public.party_members where party_id = invite_row.party_id;
    if member_count >= 4 then raise exception 'Party is full'; end if;
    insert into public.party_members(party_id, user_id) values (invite_row.party_id, auth.uid());
  end if;
  update public.party_invites
  set status = case when accept_invite then 'accepted'::public.party_invite_status else 'declined'::public.party_invite_status end,
      responded_at = now()
  where id = invite_id;
end;
$$;

create or replace function public.join_party_by_code(code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_party uuid; member_count integer;
begin
  if exists(select 1 from public.party_members where user_id = auth.uid()) then raise exception 'Leave your current party first'; end if;
  select id into target_party from public.parties where invite_code = upper(trim(code)) for update;
  if target_party is null then raise exception 'Invite code not found'; end if;
  select count(*) into member_count from public.party_members where party_id = target_party;
  if member_count >= 4 then raise exception 'Party is full'; end if;
  insert into public.party_members(party_id, user_id) values (target_party, auth.uid());
  return target_party;
end;
$$;

create or replace function public.leave_current_party()
returns void language plpgsql security definer set search_path = '' as $$
declare membership public.party_members; successor uuid;
begin
  select * into membership from public.party_members where user_id = auth.uid() for update;
  if not found then return; end if;
  if membership.role = 'leader' then
    select user_id into successor from public.party_members
    where party_id = membership.party_id and user_id <> auth.uid()
    order by joined_at limit 1;
    if successor is null then
      delete from public.parties where id = membership.party_id;
      return;
    end if;
    update public.party_members set role = 'leader' where party_id = membership.party_id and user_id = successor;
    update public.parties set owner_id = successor where id = membership.party_id;
  end if;
  delete from public.party_members where party_id = membership.party_id and user_id = auth.uid();
end;
$$;

create or replace function public.remove_party_member(target_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target_party uuid;
begin
  select party_id into target_party from public.party_members where user_id = auth.uid() and role = 'leader';
  if target_party is null then raise exception 'Only a party leader can remove members'; end if;
  if target_user = auth.uid() then raise exception 'Use leave_current_party'; end if;
  delete from public.party_members where party_id = target_party and user_id = target_user;
end;
$$;

create or replace function private.dungeon_boss_hp(dungeon text)
returns integer language sql immutable set search_path = '' as $$
  select case dungeon
    when 'ember-vault' then 5200 when 'verdant-court' then 6400
    when 'tempest-depths' then 7600 when 'caldera-core' then 9000
    when 'lunar-hunt' then 10400 when 'void-citadel' then 12500 else 0 end;
$$;

create or replace function public.start_raid_session(requested_dungeon_id text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare target_party uuid; participant_count integer; new_session uuid; max_hp integer;
begin
  select party_id into target_party from public.party_members where user_id = auth.uid() and role = 'leader';
  if target_party is null then raise exception 'Only the party leader can create a raid'; end if;
  select count(*) into participant_count from public.party_members where party_id = target_party;
  if participant_count <> 4 then raise exception 'A full four-player party is required'; end if;
  max_hp := private.dungeon_boss_hp(requested_dungeon_id);
  if max_hp = 0 then raise exception 'Unknown dungeon'; end if;

  insert into public.raid_sessions(party_id, dungeon_id, host_id, boss_hp, boss_max_hp)
  values (target_party, requested_dungeon_id, auth.uid(), max_hp, max_hp) returning id into new_session;
  insert into public.raid_participants(raid_session_id, user_id, ready, connected)
  select new_session, user_id, user_id = auth.uid(), user_id = auth.uid()
  from public.party_members where party_id = target_party;
  return new_session;
end;
$$;

create or replace function public.set_raid_ready(requested_session_id uuid, is_ready boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.raid_participants
  set ready = is_ready, connected = true, last_seen_at = now()
  where raid_session_id = requested_session_id and user_id = auth.uid();
  if not found then raise exception 'You are not in this raid'; end if;
end;
$$;

create or replace function public.heartbeat_raid_session(requested_session_id uuid, is_connected boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.raid_participants
  set connected = is_connected, last_seen_at = now()
  where raid_session_id = requested_session_id and user_id = auth.uid();
end;
$$;

create or replace function public.launch_raid_session(requested_session_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare target public.raid_sessions; ready_count integer;
begin
  select * into target from public.raid_sessions where id = requested_session_id and state = 'lobby' for update;
  if not found or target.host_id <> auth.uid() then raise exception 'Only the raid host can launch'; end if;
  select count(*) into ready_count from public.raid_participants
  where raid_session_id = requested_session_id and ready and connected and last_seen_at > now() - interval '45 seconds';
  if ready_count <> 4 then raise exception 'All four players must be online and ready'; end if;
  update public.raid_sessions set state = 'active', started_at = now() where id = requested_session_id;
end;
$$;

create or replace function public.complete_raid_session(requested_session_id uuid, outcome text, requested_damage integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare target public.raid_sessions; reward integer := 0; victory_reports integer := 0;
begin
  select * into target from public.raid_sessions where id = requested_session_id and state = 'active' for update;
  if not found then raise exception 'Active raid not found'; end if;
  if not exists(select 1 from public.raid_participants where raid_session_id = requested_session_id and user_id = auth.uid()) then
    raise exception 'You are not in this raid';
  end if;
  update public.raid_participants
  set damage = greatest(0, least(requested_damage, 100000)),
      reported_outcome = case when outcome in ('victory', 'defeat') then outcome else null end,
      last_seen_at = now()
  where raid_session_id = requested_session_id and user_id = auth.uid();

  if outcome = 'defeat' and target.host_id = auth.uid() then
    update public.raid_sessions set state = 'defeat', completed_at = now() where id = requested_session_id;
  elsif outcome = 'victory' then
    select count(*) into victory_reports from public.raid_participants
    where raid_session_id = requested_session_id
      and reported_outcome = 'victory'
      and last_seen_at > now() - interval '5 minutes';
    if victory_reports = 4 then
      update public.raid_sessions set state = 'victory', completed_at = now()
      where id = requested_session_id;
    end if;
    -- A synchronized client clear can close the session, but rewards stay
    -- disabled until every combat action is processed by a server function.
    reward := 0;
  end if;
  return jsonb_build_object('reward_xp', reward, 'server_verified', false);
end;
$$;

revoke all on all tables in schema public from anon;
grant select on public.profiles to authenticated;
grant update(display_name, character_class, appearance_id, status)
  on public.profiles to authenticated;
grant select, insert on public.friend_requests to authenticated;
grant select, delete on public.friendships to authenticated;
grant select, update, delete on public.parties to authenticated;
grant select on public.party_members, public.party_invites to authenticated;
grant select on public.party_roster to authenticated;
grant select, insert on public.party_messages to authenticated;
grant select on public.raid_sessions, public.raid_participants, public.raid_reward_claims to authenticated;

revoke execute on function public.accept_friend_request(uuid) from public, anon;
revoke execute on function public.decline_friend_request(uuid) from public, anon;
revoke execute on function public.create_party_with_leader(text) from public, anon;
revoke execute on function public.invite_friend_to_party(uuid) from public, anon;
revoke execute on function public.respond_party_invite(uuid, boolean) from public, anon;
revoke execute on function public.join_party_by_code(text) from public, anon;
revoke execute on function public.leave_current_party() from public, anon;
revoke execute on function public.remove_party_member(uuid) from public, anon;
revoke execute on function public.start_raid_session(text) from public, anon;
revoke execute on function public.set_raid_ready(uuid, boolean) from public, anon;
revoke execute on function public.heartbeat_raid_session(uuid, boolean) from public, anon;
revoke execute on function public.launch_raid_session(uuid) from public, anon;
revoke execute on function public.complete_raid_session(uuid, text, integer) from public, anon;

grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.decline_friend_request(uuid) to authenticated;
grant execute on function public.create_party_with_leader(text) to authenticated;
grant execute on function public.invite_friend_to_party(uuid) to authenticated;
grant execute on function public.respond_party_invite(uuid, boolean) to authenticated;
grant execute on function public.join_party_by_code(text) to authenticated;
grant execute on function public.leave_current_party() to authenticated;
grant execute on function public.remove_party_member(uuid) to authenticated;
grant execute on function public.start_raid_session(text) to authenticated;
grant execute on function public.set_raid_ready(uuid, boolean) to authenticated;
grant execute on function public.heartbeat_raid_session(uuid, boolean) to authenticated;
grant execute on function public.launch_raid_session(uuid) to authenticated;
grant execute on function public.complete_raid_session(uuid, text, integer) to authenticated;

alter publication supabase_realtime add table public.friend_requests;
alter publication supabase_realtime add table public.party_invites;
alter publication supabase_realtime add table public.party_messages;
alter publication supabase_realtime add table public.party_members;
alter publication supabase_realtime add table public.raid_sessions;
alter publication supabase_realtime add table public.raid_participants;

create policy party_realtime_read on realtime.messages for select to authenticated
using (
  private.is_party_member(private.party_id_from_topic(realtime.topic()))
);
create policy party_realtime_write on realtime.messages for insert to authenticated
with check (
  private.is_party_member(private.party_id_from_topic(realtime.topic()))
);

commit;
