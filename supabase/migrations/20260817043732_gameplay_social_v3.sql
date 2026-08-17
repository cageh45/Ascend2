begin;

-- Release hardening for the social graph.
alter function private.set_updated_at() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create index if not exists friend_requests_sender_idx
  on public.friend_requests(sender_id);
create index if not exists friend_requests_receiver_idx
  on public.friend_requests(receiver_id);
create index if not exists parties_owner_idx
  on public.parties(owner_id);
create index if not exists party_invites_invited_by_idx
  on public.party_invites(invited_by);
create index if not exists party_invites_invited_user_idx
  on public.party_invites(invited_user_id);
create index if not exists party_messages_sender_idx
  on public.party_messages(sender_id);
create index if not exists raid_participants_user_idx
  on public.raid_participants(user_id);
create index if not exists raid_sessions_host_idx
  on public.raid_sessions(host_id);

create table public.social_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index social_blocks_blocked_idx on public.social_blocks(blocked_id);

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid not null references public.profiles(id) on delete cascade,
  party_message_id uuid references public.party_messages(id) on delete set null,
  category text not null check (category in ('harassment', 'hate', 'sexual', 'spam', 'unsafe', 'other')),
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);
create index content_reports_reporter_idx on public.content_reports(reporter_id, created_at desc);
create index content_reports_status_idx on public.content_reports(status, created_at)
  where status in ('pending', 'reviewing');

alter table public.social_blocks enable row level security;
alter table public.content_reports enable row level security;

create policy social_blocks_read_own on public.social_blocks
  for select to authenticated
  using ((select auth.uid()) = blocker_id);
create policy social_blocks_delete_own on public.social_blocks
  for delete to authenticated
  using ((select auth.uid()) = blocker_id);
create policy content_reports_read_own on public.content_reports
  for select to authenticated
  using ((select auth.uid()) = reporter_id);

grant select, delete on public.social_blocks to authenticated;
grant select on public.content_reports to authenticated;

create or replace function private.is_blocked_pair(first_user uuid, second_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.social_blocks
    where (blocker_id = first_user and blocked_id = second_user)
       or (blocker_id = second_user and blocked_id = first_user)
  );
$$;
revoke execute on function private.is_blocked_pair(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.block_player(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  actor_party uuid;
  target_party uuid;
  actor_is_leader boolean := false;
  target_is_leader boolean := false;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if target_user is null or target_user = actor then raise exception 'Choose another player'; end if;
  if not exists (select 1 from public.profiles where id = target_user) then
    raise exception 'Player not found';
  end if;

  insert into public.social_blocks(blocker_id, blocked_id)
  values (actor, target_user)
  on conflict do nothing;

  delete from public.friendships
  where user_low = least(actor, target_user)
    and user_high = greatest(actor, target_user);
  delete from public.friend_requests
  where actor in (sender_id, receiver_id)
    and target_user in (sender_id, receiver_id);
  delete from public.party_invites
  where (invited_by = actor and invited_user_id = target_user)
     or (invited_by = target_user and invited_user_id = actor);

  select party_id, role = 'leader' into actor_party, actor_is_leader
  from public.party_members where user_id = actor;
  select party_id, role = 'leader' into target_party, target_is_leader
  from public.party_members where user_id = target_user;

  if actor_party is not null and actor_party = target_party then
    if actor_is_leader then
      delete from public.party_members
      where party_id = actor_party and user_id = target_user;
    elsif target_is_leader then
      delete from public.party_members
      where party_id = actor_party and user_id = actor;
    else
      delete from public.party_members
      where party_id = actor_party and user_id = actor;
    end if;
  end if;
end;
$$;

create or replace function public.unblock_player(target_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  delete from public.social_blocks
  where blocker_id = auth.uid() and blocked_id = target_user;
end;
$$;

create or replace function public.report_party_message(
  requested_message_id uuid,
  requested_category text,
  requested_details text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target_message public.party_messages;
  report_id uuid;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if requested_category not in ('harassment', 'hate', 'sexual', 'spam', 'unsafe', 'other') then
    raise exception 'Unknown report category';
  end if;

  select * into target_message
  from public.party_messages
  where id = requested_message_id;
  if not found or not private.is_party_member(target_message.party_id, actor) then
    raise exception 'Message not found';
  end if;
  if target_message.sender_id = actor then raise exception 'You cannot report your own message'; end if;

  insert into public.content_reports(
    reporter_id,
    reported_user_id,
    party_message_id,
    category,
    details
  ) values (
    actor,
    target_message.sender_id,
    target_message.id,
    requested_category,
    left(trim(coalesce(requested_details, '')), 500)
  ) returning id into report_id;
  return report_id;
end;
$$;

-- Server-authoritative party raid actions and one reward per dungeon per UTC day.
alter table public.raid_reward_claims
  add column dungeon_id text,
  add column reward_day date;
update public.raid_reward_claims claims
set dungeon_id = sessions.dungeon_id,
    reward_day = (claims.claimed_at at time zone 'UTC')::date
from public.raid_sessions sessions
where sessions.id = claims.raid_session_id;
alter table public.raid_reward_claims
  alter column dungeon_id set not null,
  alter column reward_day set not null,
  add constraint raid_reward_dungeon_check check (
    dungeon_id in ('ember-vault', 'verdant-court', 'tempest-depths', 'caldera-core', 'lunar-hunt', 'void-citadel')
  );
create unique index raid_reward_daily_dungeon_idx
  on public.raid_reward_claims(user_id, dungeon_id, reward_day);
create index raid_reward_claims_user_idx
  on public.raid_reward_claims(user_id);

alter table public.raid_participants
  add column last_action_at timestamptz;

create table public.raid_actions (
  id bigint generated by default as identity primary key,
  raid_session_id uuid not null references public.raid_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_kind text not null check (action_kind in ('quick', 'power', 'focus', 'ability')),
  damage integer not null check (damage >= 0),
  boss_hp_after integer not null check (boss_hp_after >= 0),
  created_at timestamptz not null default now()
);
create index raid_actions_session_created_idx
  on public.raid_actions(raid_session_id, created_at desc);
create index raid_actions_user_idx on public.raid_actions(user_id);
alter table public.raid_actions enable row level security;
create policy raid_actions_read_party on public.raid_actions
  for select to authenticated
  using (
    exists (
      select 1 from public.raid_sessions sessions
      where sessions.id = raid_session_id
        and private.is_party_member(sessions.party_id)
    )
  );
grant select on public.raid_actions to authenticated;

create or replace function private.dungeon_reward_xp(dungeon text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case dungeon
    when 'ember-vault' then 450
    when 'verdant-court' then 600
    when 'tempest-depths' then 750
    when 'caldera-core' then 900
    when 'lunar-hunt' then 1050
    when 'void-citadel' then 1250
    else 0 end;
$$;

create or replace function public.perform_raid_action(
  requested_session_id uuid,
  requested_action_kind text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target public.raid_sessions;
  participant public.raid_participants;
  player public.profiles;
  base_damage integer;
  class_multiplier numeric := 1;
  dealt integer := 0;
  next_hp integer;
  next_state public.raid_state;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if requested_action_kind not in ('quick', 'power', 'focus', 'ability') then
    raise exception 'Unknown raid action';
  end if;

  select * into target from public.raid_sessions
  where id = requested_session_id and state = 'active'
  for update;
  if not found then raise exception 'Active raid not found'; end if;

  select * into participant from public.raid_participants
  where raid_session_id = target.id and user_id = actor
  for update;
  if not found then raise exception 'You are not in this raid'; end if;
  if not participant.ready or not participant.connected
     or participant.last_seen_at < now() - interval '45 seconds' then
    raise exception 'Reconnect and ready up before attacking';
  end if;
  if exists (
    select 1 from public.raid_participants
    where raid_session_id = target.id
      and (not ready or not connected or last_seen_at < now() - interval '45 seconds')
  ) then
    raise exception 'Every party member must remain online and ready';
  end if;
  if participant.last_action_at is not null
     and participant.last_action_at > clock_timestamp() - interval '650 milliseconds' then
    raise exception 'Action cooldown is still active';
  end if;

  select * into player from public.profiles where id = actor;
  base_damage := case requested_action_kind
    when 'quick' then 115
    when 'power' then 210
    when 'ability' then 310
    else 0 end;
  class_multiplier := case player.character_class
    when 'Warrior' then 1.08
    when 'Scholar' then 1.06
    when 'Ranger' then 1.05
    else 1.00 end;
  dealt := greatest(
    0,
    round(
      (base_damage + player.level * case requested_action_kind
        when 'ability' then 19 when 'power' then 14 when 'quick' then 9 else 0 end)
      * class_multiplier
      * (0.92 + random() * 0.16)
    )::integer
  );
  next_hp := greatest(0, target.boss_hp - dealt);
  next_state := case when next_hp = 0 then 'victory'::public.raid_state else 'active'::public.raid_state end;

  update public.raid_sessions
  set boss_hp = next_hp,
      state = next_state,
      completed_at = case when next_hp = 0 then now() else completed_at end
  where id = target.id;
  update public.raid_participants
  set damage = damage + dealt,
      last_action_at = clock_timestamp(),
      last_seen_at = now()
  where raid_session_id = target.id and user_id = actor;
  insert into public.raid_actions(raid_session_id, user_id, action_kind, damage, boss_hp_after)
  values (target.id, actor, requested_action_kind, dealt, next_hp);

  return jsonb_build_object(
    'damage', dealt,
    'boss_hp', next_hp,
    'boss_max_hp', target.boss_max_hp,
    'state', next_state,
    'server_verified', true
  );
end;
$$;

create or replace function public.claim_verified_raid_reward(requested_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target public.raid_sessions;
  reward integer;
  reward_date date := (now() at time zone 'UTC')::date;
  inserted_count integer := 0;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  select * into target from public.raid_sessions
  where id = requested_session_id and state = 'victory';
  if not found then raise exception 'Verified victory not found'; end if;
  if not exists (
    select 1 from public.raid_participants
    where raid_session_id = target.id and user_id = actor
  ) then raise exception 'You did not participate in this raid'; end if;

  reward := private.dungeon_reward_xp(target.dungeon_id);
  insert into public.raid_reward_claims(
    raid_session_id, user_id, dungeon_id, reward_day, reward_xp
  ) values (
    target.id, actor, target.dungeon_id, reward_date, reward
  ) on conflict (user_id, dungeon_id, reward_day) do nothing;
  get diagnostics inserted_count = row_count;

  return jsonb_build_object(
    'reward_xp', case when inserted_count = 1 then reward else 0 end,
    'already_claimed', inserted_count = 0,
    'dungeon_id', target.dungeon_id,
    'reward_day', reward_date,
    'server_verified', true
  );
end;
$$;

revoke execute on function public.block_player(uuid) from public, anon;
revoke execute on function public.unblock_player(uuid) from public, anon;
revoke execute on function public.report_party_message(uuid, text, text) from public, anon;
revoke execute on function public.perform_raid_action(uuid, text) from public, anon;
revoke execute on function public.claim_verified_raid_reward(uuid) from public, anon;
grant execute on function public.block_player(uuid) to authenticated;
grant execute on function public.unblock_player(uuid) to authenticated;
grant execute on function public.report_party_message(uuid, text, text) to authenticated;
grant execute on function public.perform_raid_action(uuid, text) to authenticated;
grant execute on function public.claim_verified_raid_reward(uuid) to authenticated;

alter publication supabase_realtime add table public.raid_actions;

commit;
