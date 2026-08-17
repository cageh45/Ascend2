begin;

-- Legacy clients used this RPC to report a locally simulated outcome. Keep it
-- available for defeat reporting, but never let it create a victory or reward.
create or replace function public.complete_raid_session(
  requested_session_id uuid,
  outcome text,
  requested_damage integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  target public.raid_sessions;
begin
  if actor is null then raise exception 'Authentication required'; end if;
  if outcome <> 'defeat' then
    raise exception 'Victories must be completed by server-authoritative combat';
  end if;

  select * into target from public.raid_sessions
  where id = requested_session_id and state = 'active'
  for update;
  if not found then raise exception 'Active raid not found'; end if;
  if not exists (
    select 1 from public.raid_participants
    where raid_session_id = requested_session_id and user_id = actor
  ) then raise exception 'You are not in this raid'; end if;

  update public.raid_participants
  set reported_outcome = 'defeat', last_seen_at = now()
  where raid_session_id = requested_session_id and user_id = actor;

  if target.host_id = actor then
    update public.raid_sessions
    set state = 'defeat', completed_at = now()
    where id = requested_session_id;
  end if;

  return jsonb_build_object(
    'reward_xp', 0,
    'server_verified', false,
    'state', case when target.host_id = actor then 'defeat' else 'active' end
  );
end;
$$;

revoke execute on function public.complete_raid_session(uuid, text, integer)
  from public, anon;
grant execute on function public.complete_raid_session(uuid, text, integer)
  to authenticated;

commit;
