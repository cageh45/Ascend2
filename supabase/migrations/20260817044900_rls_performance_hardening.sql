begin;

create index if not exists content_reports_reported_user_idx
  on public.content_reports(reported_user_id)
  where reported_user_id is not null;
create index if not exists content_reports_party_message_idx
  on public.content_reports(party_message_id)
  where party_message_id is not null;

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists friend_requests_read_participant on public.friend_requests;
create policy friend_requests_read_participant on public.friend_requests for select to authenticated
  using ((select auth.uid()) in (sender_id, receiver_id));

drop policy if exists friend_requests_send on public.friend_requests;
create policy friend_requests_send on public.friend_requests for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and status = 'pending'
    and responded_at is null
    and not private.is_friend(receiver_id, (select auth.uid()))
  );

drop policy if exists friendships_read_member on public.friendships;
create policy friendships_read_member on public.friendships for select to authenticated
  using ((select auth.uid()) in (user_low, user_high));

drop policy if exists friendships_delete_member on public.friendships;
create policy friendships_delete_member on public.friendships for delete to authenticated
  using ((select auth.uid()) in (user_low, user_high));

drop policy if exists parties_read_member on public.parties;
create policy parties_read_member on public.parties for select to authenticated
  using (
    private.is_party_member(id, (select auth.uid()))
    or exists (
      select 1 from public.party_invites as pending_invite
      where pending_invite.party_id = parties.id
        and pending_invite.invited_user_id = (select auth.uid())
        and pending_invite.status = 'pending'
    )
  );

drop policy if exists parties_update_leader on public.parties;
create policy parties_update_leader on public.parties for update to authenticated
  using (private.is_party_leader(id, (select auth.uid())))
  with check (owner_id = (select auth.uid()));

drop policy if exists parties_delete_leader on public.parties;
create policy parties_delete_leader on public.parties for delete to authenticated
  using (private.is_party_leader(id, (select auth.uid())));

drop policy if exists party_members_read_member on public.party_members;
create policy party_members_read_member on public.party_members for select to authenticated
  using (private.is_party_member(party_id, (select auth.uid())));

drop policy if exists party_invites_read_participant on public.party_invites;
create policy party_invites_read_participant on public.party_invites for select to authenticated
  using (
    invited_user_id = (select auth.uid())
    or private.is_party_member(party_id, (select auth.uid()))
  );

drop policy if exists party_messages_read_member on public.party_messages;
create policy party_messages_read_member on public.party_messages for select to authenticated
  using (private.is_party_member(party_id, (select auth.uid())));

drop policy if exists party_messages_send_member on public.party_messages;
create policy party_messages_send_member on public.party_messages for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and private.is_party_member(party_id, (select auth.uid()))
  );

drop policy if exists raid_sessions_read_member on public.raid_sessions;
create policy raid_sessions_read_member on public.raid_sessions for select to authenticated
  using (private.is_party_member(party_id, (select auth.uid())));

drop policy if exists raid_participants_read_member on public.raid_participants;
create policy raid_participants_read_member on public.raid_participants for select to authenticated
  using (
    exists (
      select 1 from public.raid_sessions as session
      where session.id = raid_participants.raid_session_id
        and private.is_party_member(session.party_id, (select auth.uid()))
    )
  );

drop policy if exists raid_rewards_read_self on public.raid_reward_claims;
create policy raid_rewards_read_self on public.raid_reward_claims for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists raid_actions_read_party on public.raid_actions;
create policy raid_actions_read_party on public.raid_actions for select to authenticated
  using (
    exists (
      select 1 from public.raid_sessions as session
      where session.id = raid_actions.raid_session_id
        and private.is_party_member(session.party_id, (select auth.uid()))
    )
  );

commit;
