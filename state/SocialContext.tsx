import type { RealtimeChannel } from '@supabase/supabase-js';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { FriendProfile } from '../data/socialData';
import {
  CHARACTER_CLASS_NAMES,
  CharacterClassName,
  getLevelProgress,
} from '../game/gameData';
import { useGame } from './GameContext';
import { useAuth } from './AuthContext';
import { requireSupabase, supabase } from '../services/supabase';
import type { Database } from '../services/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type PartyRow = Database['public']['Tables']['parties']['Row'];
type PartyRosterRow = Database['public']['Views']['party_roster']['Row'];
type SocialProfileRow = Pick<
  ProfileRow,
  'id' | 'handle' | 'display_name' | 'character_class' | 'level' | 'status' |
  'weekly_xp' | 'raid_contribution' | 'last_seen_at'
>;
type FriendRequestItem = { id: string; profile: FriendProfile };

export type PartyMessage = {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
};

export type PartyState = {
  id: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  members: FriendProfile[];
};

export type RaidParticipant = {
  userId: string;
  ready: boolean;
  connected: boolean;
  damage: number;
};

export type OnlineRaid = {
  id: string;
  dungeonId: string;
  state: 'lobby' | 'active' | 'victory' | 'defeat' | 'abandoned';
  hostId: string;
  participants: RaidParticipant[];
};

type SocialContextValue = {
  available: boolean;
  loading: boolean;
  errorMessage: string | null;
  profile: ProfileRow | null;
  friends: FriendProfile[];
  suggestions: FriendProfile[];
  incomingRequests: FriendRequestItem[];
  outgoingRequests: FriendRequestItem[];
  incomingPartyInvites: { id: string; partyName: string; inviterName: string }[];
  party: PartyState | null;
  messages: PartyMessage[];
  onlineRaid: OnlineRaid | null;
  refresh: () => Promise<void>;
  searchPlayers: (query: string) => Promise<FriendProfile[]>;
  sendFriendRequest: (profileId: string) => Promise<boolean>;
  cancelFriendRequest: (requestId: string) => Promise<boolean>;
  acceptFriendRequest: (requestId: string) => Promise<boolean>;
  declineFriendRequest: (requestId: string) => Promise<boolean>;
  respondPartyInvite: (inviteId: string, accept: boolean) => Promise<boolean>;
  removeFriend: (profileId: string) => Promise<boolean>;
  createParty: (name: string) => Promise<boolean>;
  joinParty: (code: string) => Promise<boolean>;
  leaveParty: () => Promise<boolean>;
  inviteToParty: (profileId: string) => Promise<boolean>;
  removePartyMember: (profileId: string) => Promise<boolean>;
  sendMessage: (text: string) => Promise<boolean>;
  createRaid: (dungeonId: string) => Promise<boolean>;
  setRaidReady: (ready: boolean) => Promise<boolean>;
  launchRaid: () => Promise<boolean>;
  reportRaidResult: (outcome: 'victory' | 'defeat', damage: number) => Promise<void>;
};

const SocialContext = createContext<SocialContextValue | null>(null);

export function SocialProvider({ children }: PropsWithChildren) {
  const { status: authStatus, user } = useAuth();
  const {
    appearanceId,
    characterClass,
    characterName,
    raidWins,
    totalXp,
  } = useGame();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [suggestions, setSuggestions] = useState<FriendProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<
    FriendRequestItem[]
  >([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [incomingPartyInvites, setIncomingPartyInvites] = useState<
    { id: string; partyName: string; inviterName: string }[]
  >([]);
  const [party, setParty] = useState<PartyState | null>(null);
  const [messages, setMessages] = useState<PartyMessage[]>([]);
  const [onlineRaid, setOnlineRaid] = useState<OnlineRaid | null>(null);
  const presenceChannel = useRef<RealtimeChannel | null>(null);
  const databaseChannel = useRef<RealtimeChannel | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const level = getLevelProgress(totalXp).level;
      const syncResult = await supabase.rpc('sync_player_profile', {
        requested_display_name: characterName,
        requested_character_class: characterClass,
        requested_appearance_id: appearanceId,
        requested_level: level,
        requested_progress_xp: totalXp,
        requested_raid_contribution: raidWins * 1250,
      });
      throwFirstError(syncResult.error);

      const [profileResult, friendshipsResult, requestsResult, outgoingRequestsResult, membershipResult, partyInvitesResult] =
        await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('friendships').select('*').or(`user_low.eq.${user.id},user_high.eq.${user.id}`),
          supabase.from('friend_requests').select('*').eq('receiver_id', user.id).eq('status', 'pending'),
          supabase.from('friend_requests').select('*').eq('sender_id', user.id).eq('status', 'pending'),
          supabase.from('party_members').select('*').eq('user_id', user.id).maybeSingle(),
          supabase.from('party_invites').select('*').eq('invited_user_id', user.id).eq('status', 'pending'),
        ]);
      throwFirstError(profileResult.error, friendshipsResult.error, requestsResult.error, outgoingRequestsResult.error, membershipResult.error, partyInvitesResult.error);

      const friendIds = (friendshipsResult.data ?? []).map((row) =>
        row.user_low === user.id ? row.user_high : row.user_low,
      );
      const friendProfiles = friendIds.length
        ? await supabase.from('profiles').select('*').in('id', friendIds)
        : { data: [] as ProfileRow[], error: null };
      throwFirstError(friendProfiles.error);

      const suggestionResult = await supabase.rpc('search_players', {
        search_term: '',
        result_limit: 20,
      });
      throwFirstError(suggestionResult.error);
      const requestSenderIds = (requestsResult.data ?? []).map((row) => row.sender_id);
      const requestReceiverIds = (outgoingRequestsResult.data ?? []).map((row) => row.receiver_id);
      const requestProfiles = requestSenderIds.length
        ? await supabase.from('profiles').select('*').in('id', requestSenderIds)
        : { data: [] as ProfileRow[], error: null };
      const outgoingProfiles = requestReceiverIds.length
        ? await supabase.from('profiles').select('*').in('id', requestReceiverIds)
        : { data: [] as ProfileRow[], error: null };
      throwFirstError(requestProfiles.error, outgoingProfiles.error);
      const invitePartyIds = (partyInvitesResult.data ?? []).map((row) => row.party_id);
      const inviteSenderIds = (partyInvitesResult.data ?? []).map((row) => row.invited_by);
      const [inviteParties, inviteSenders] = await Promise.all([
        invitePartyIds.length
          ? supabase.from('parties').select('*').in('id', invitePartyIds)
          : Promise.resolve({ data: [] as PartyRow[], error: null }),
        inviteSenderIds.length
          ? supabase.from('profiles').select('*').in('id', inviteSenderIds)
          : Promise.resolve({ data: [] as ProfileRow[], error: null }),
      ]);
      throwFirstError(inviteParties.error, inviteSenders.error);

      setProfile(profileResult.data);
      setFriends((friendProfiles.data ?? []).map((row) => toFriend(row)));
      setSuggestions((suggestionResult.data ?? []).map((row) => toFriend(row)));
      setIncomingRequests(
        (requestsResult.data ?? []).flatMap((request) => {
          const sender = requestProfiles.data?.find((row) => row.id === request.sender_id);
          return sender ? [{ id: request.id, profile: toFriend(sender) }] : [];
        }),
      );
      setOutgoingRequests(
        (outgoingRequestsResult.data ?? []).flatMap((request) => {
          const receiver = outgoingProfiles.data?.find((row) => row.id === request.receiver_id);
          return receiver ? [{ id: request.id, profile: toFriend(receiver) }] : [];
        }),
      );
      setIncomingPartyInvites(
        (partyInvitesResult.data ?? []).flatMap((invite) => {
          const invitedParty = inviteParties.data?.find((row) => row.id === invite.party_id);
          const inviter = inviteSenders.data?.find((row) => row.id === invite.invited_by);
          return invitedParty
            ? [{
                id: invite.id,
                partyName: invitedParty.name,
                inviterName: inviter?.display_name ?? 'A friend',
              }]
            : [];
        }),
      );

      if (!membershipResult.data) {
        setParty(null);
        setMessages([]);
        setOnlineRaid(null);
        return;
      }
      const partyId = membershipResult.data.party_id;
      const [partyResult, rosterResult, messageResult, raidResult] = await Promise.all([
        supabase.from('parties').select('*').eq('id', partyId).single(),
        supabase.from('party_roster').select('*').eq('party_id', partyId),
        supabase.from('party_messages').select('*').eq('party_id', partyId).order('created_at', { ascending: true }).limit(100),
        supabase.from('raid_sessions').select('*').eq('party_id', partyId).in('state', ['lobby', 'active']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      throwFirstError(partyResult.error, rosterResult.error, messageResult.error, raidResult.error);
      if (!partyResult.data) throw new Error('Party data could not be loaded.');
      setParty(toParty(partyResult.data, rosterResult.data ?? [], user.id));
      setMessages(
        (messageResult.data ?? []).map((message) => ({
          id: message.id,
          senderId: message.sender_id,
          text: message.body,
          timestamp: new Date(message.created_at).getTime(),
        })),
      );

      if (raidResult.data) {
        const participantResult = await supabase
          .from('raid_participants')
          .select('*')
          .eq('raid_session_id', raidResult.data.id);
        throwFirstError(participantResult.error);
        setOnlineRaid({
          id: raidResult.data.id,
          dungeonId: raidResult.data.dungeon_id,
          state: raidResult.data.state,
          hostId: raidResult.data.host_id,
          participants: (participantResult.data ?? []).map((row) => ({
            userId: row.user_id,
            ready: row.ready,
            connected: row.connected,
            damage: row.damage,
          })),
        });
      } else {
        setOnlineRaid(null);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Online services could not sync.');
    } finally {
      setLoading(false);
    }
  }, [appearanceId, characterClass, characterName, raidWins, totalXp, user]);

  useEffect(() => {
    if (authStatus !== 'authenticated' || !user) return;
    void refresh();
  }, [authStatus, refresh, user]);

  useEffect(() => {
    if (!supabase || !user) return;
    const client = supabase;
    const timer = setInterval(() => {
      void client.rpc('heartbeat_player');
    }, 45_000);
    return () => clearInterval(timer);
  }, [user]);

  useEffect(() => {
    if (!supabase || !user) return;
    const client = supabase;
    const channel = client
      .channel(`social-inbox:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `receiver_id=eq.${user.id}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests', filter: `sender_id=eq.${user.id}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'party_invites', filter: `invited_user_id=eq.${user.id}` }, () => void refresh())
      .subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [refresh, user]);

  useEffect(() => {
    if (!supabase || !user || !party) return;
    const client = supabase;
    const dbChannel = client
      .channel(`party-db:${party.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'party_messages', filter: `party_id=eq.${party.id}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'party_members', filter: `party_id=eq.${party.id}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'raid_sessions', filter: `party_id=eq.${party.id}` }, () => void refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'raid_participants' }, () => void refresh())
      .subscribe();
    databaseChannel.current = dbChannel;

    const channel = client.channel(`party:${party.id}`, {
      config: { private: true, presence: { key: user.id } },
    });
    const syncPresence = () => {
      const onlineIds = new Set(Object.keys(channel.presenceState()));
      setParty((current) =>
        current
          ? {
              ...current,
              members: current.members.map((member) => ({
                ...member,
                isOnline: member.id === user.id || onlineIds.has(member.id),
              })),
            }
          : null,
      );
    };
    channel.on('presence', { event: 'sync' }, syncPresence).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
      }
    });
    presenceChannel.current = channel;

    return () => {
      void channel.untrack();
      void client.removeChannel(channel);
      void client.removeChannel(dbChannel);
      presenceChannel.current = null;
      databaseChannel.current = null;
    };
  }, [party?.id, refresh, user]);

  useEffect(() => {
    if (!supabase || !user || !onlineRaid) return;
    const client = supabase;
    void client.rpc('heartbeat_raid_session', {
      requested_session_id: onlineRaid.id,
      is_connected: true,
    });
    const timer = setInterval(() => {
      void client.rpc('heartbeat_raid_session', {
        requested_session_id: onlineRaid.id,
        is_connected: true,
      });
    }, 20_000);
    return () => {
      clearInterval(timer);
      void client.rpc('heartbeat_raid_session', {
        requested_session_id: onlineRaid.id,
        is_connected: false,
      });
    };
  }, [onlineRaid?.id, user]);

  const mutate = useCallback(
    async (operation: () => PromiseLike<{ error: { message: string } | null }>) => {
      setErrorMessage(null);
      try {
        const { error } = await operation();
        if (error) throw new Error(error.message);
        await refresh();
        return true;
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Online action failed.');
        return false;
      }
    },
    [refresh],
  );

  const searchPlayers = useCallback(async (query: string) => {
    if (!supabase || !user) return [];
    setErrorMessage(null);
    try {
      const result = await supabase.rpc('search_players', {
        search_term: query.trim().replace(/^@/, ''),
        result_limit: 30,
      });
      if (result.error) throw new Error(result.error.message);
      return (result.data ?? []).map((row) => toFriend(row));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Player search failed.');
      return [];
    }
  }, [user]);

  const value = useMemo<SocialContextValue>(() => ({
    available: Boolean(supabase && user),
    loading,
    errorMessage,
    profile,
    friends,
    suggestions,
    incomingRequests,
    outgoingRequests,
    incomingPartyInvites,
    party,
    messages,
    onlineRaid,
    refresh,
    searchPlayers,
    sendFriendRequest: (profileId) => mutate(() =>
      requireSupabase().rpc('send_friend_request', { target_user: profileId })),
    cancelFriendRequest: (requestId) => mutate(() =>
      requireSupabase().rpc('cancel_friend_request', { request_id: requestId })),
    acceptFriendRequest: (requestId) => mutate(() =>
      requireSupabase().rpc('accept_friend_request', { request_id: requestId })),
    declineFriendRequest: (requestId) => mutate(() =>
      requireSupabase().rpc('decline_friend_request', { request_id: requestId })),
    respondPartyInvite: (inviteId, accept) => mutate(() =>
      requireSupabase().rpc('respond_party_invite', {
        invite_id: inviteId,
        accept_invite: accept,
      })),
    removeFriend: (profileId) => mutate(() =>
      requireSupabase().rpc('remove_friend', { target_user: profileId })),
    createParty: (name) => mutate(() =>
      requireSupabase().rpc('create_party_with_leader', { party_name: name.trim() })),
    joinParty: (code) => mutate(() =>
      requireSupabase().rpc('join_party_by_code', { code: code.trim().toUpperCase() })),
    leaveParty: () => mutate(() => requireSupabase().rpc('leave_current_party')),
    inviteToParty: (profileId) => mutate(() =>
      requireSupabase().rpc('invite_friend_to_party', { target_user: profileId })),
    removePartyMember: (profileId) => mutate(() =>
      requireSupabase().rpc('remove_party_member', { target_user: profileId })),
    sendMessage: async (text) => {
      if (!party || !user) return false;
      const body = text.trim().slice(0, 280);
      if (!body) return false;
      return mutate(() => requireSupabase().from('party_messages').insert({ party_id: party.id, sender_id: user.id, body }));
    },
    createRaid: (dungeonId) => mutate(() =>
      requireSupabase().rpc('start_raid_session', { requested_dungeon_id: dungeonId })),
    setRaidReady: (ready) =>
      onlineRaid
        ? mutate(() => requireSupabase().rpc('set_raid_ready', { requested_session_id: onlineRaid.id, is_ready: ready }))
        : Promise.resolve(false),
    launchRaid: () =>
      onlineRaid
        ? mutate(() => requireSupabase().rpc('launch_raid_session', { requested_session_id: onlineRaid.id }))
        : Promise.resolve(false),
    reportRaidResult: async (outcome, damage) => {
      if (!onlineRaid) return;
      await mutate(() => requireSupabase().rpc('complete_raid_session', {
        requested_session_id: onlineRaid.id,
        outcome,
        requested_damage: Math.max(0, Math.round(damage)),
      }));
    },
  }), [errorMessage, friends, incomingPartyInvites, incomingRequests, loading, messages, mutate, onlineRaid, outgoingRequests, party, profile, refresh, searchPlayers, suggestions, user]);

  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>;
}

function toFriend(row: SocialProfileRow, isOnline = isRecentlyOnline(row.last_seen_at)): FriendProfile {
  const characterClass = CHARACTER_CLASS_NAMES.includes(row.character_class as CharacterClassName)
    ? (row.character_class as CharacterClassName)
    : 'Warrior';
  return {
    id: row.id,
    name: row.display_name,
    handle: row.handle,
    characterClass,
    level: row.level,
    status: row.status,
    isOnline,
    weeklyXp: row.weekly_xp,
    raidContribution: row.raid_contribution,
  };
}

function isRecentlyOnline(lastSeenAt: string) {
  return Date.now() - new Date(lastSeenAt).getTime() < 90_000;
}

function toParty(party: PartyRow, roster: PartyRosterRow[], currentUserId: string): PartyState {
  return {
    id: party.id,
    name: party.name,
    inviteCode: party.invite_code,
    ownerId: party.owner_id,
    members: roster
      .filter(isSocialProfile)
      .map((row) => toFriend(row, row.id === currentUserId)),
  };
}

function isSocialProfile(row: PartyRosterRow): row is PartyRosterRow & SocialProfileRow {
  return Boolean(
    row.id &&
    row.handle &&
    row.display_name &&
    row.character_class &&
    row.level !== null &&
    row.status !== null &&
    row.weekly_xp !== null &&
    row.raid_contribution !== null &&
    row.last_seen_at,
  );
}

function throwFirstError(...errors: readonly ({ message: string } | null)[]) {
  const error = errors.find(Boolean);
  if (error) throw new Error(error.message);
}

export function useSocial() {
  const context = useContext(SocialContext);
  if (!context) throw new Error('useSocial must be used inside SocialProvider');
  return context;
}
