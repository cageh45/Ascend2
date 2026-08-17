import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import type { FriendProfile } from '../data/socialData';
import { CLASS_SPRITES } from '../game/appearanceData';
import { CHARACTER_CLASSES, getLevelProgress } from '../game/gameData';
import { getEquippedGearSet } from '../game/gearData';
import { useAuth } from '../state/AuthContext';
import { useGame } from '../state/GameContext';
import { useSocial } from '../state/SocialContext';
import { useMusic } from '../state/MusicContext';

export default function FriendsScreen() {
  const {
    characterClass,
    characterName,
    equippedGearSetId,
    totalXp,
  } = useGame();
  const { enableOnlineAccount, errorMessage: authError, status: authStatus, user } = useAuth();
  const {
    acceptFriendRequest,
    available,
    blockedUserIds,
    blockPlayer,
    cancelFriendRequest,
    createParty,
    declineFriendRequest,
    errorMessage,
    friends,
    incomingRequests,
    incomingPartyInvites,
    inviteToParty,
    joinParty,
    leaveParty,
    loading,
    messages,
    outgoingRequests,
    party,
    profile,
    refresh,
    removeFriend,
    removePartyMember,
    reportMessage,
    respondPartyInvite,
    sendFriendRequest,
    sendMessage,
    searchPlayers,
    suggestions,
    unblockPlayer,
  } = useSocial();
  const { playTrack } = useMusic();
  const [showParty, setShowParty] = useState(false);
  const [showFinder, setShowFinder] = useState(false);
  const [partyName, setPartyName] = useState('Ascend Squad');
  const [inviteCode, setInviteCode] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const level = getLevelProgress(totalXp).level;
  const gear = getEquippedGearSet(characterClass, equippedGearSetId);
  const partyMembers = party?.members.filter((member) => member.id !== user?.id) ?? [];
  const isLeader = party?.ownerId === user?.id;
  const partyPower = partyMembers.reduce(
    (sum, member) => sum + member.raidContribution,
    1250,
  );
  const profileById = useMemo(
    () => new Map([...friends, ...partyMembers].map((profile) => [profile.id, profile])),
    [friends, partyMembers],
  );

  useFocusEffect(useCallback(() => {
    playTrack('party-camp');
    void refresh();
  }, [playTrack, refresh]));

  async function run(action: () => Promise<boolean>) {
    setBusy(true);
    const success = await action();
    setBusy(false);
    if (success) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
    return success;
  }

  async function handleCreate() {
    if (await run(() => createParty(partyName))) setShowParty(false);
  }

  async function handleJoin() {
    if (await run(() => joinParty(inviteCode))) setInviteCode('');
  }

  function confirmLeave() {
    Alert.alert(
      isLeader ? 'Leave or disband party?' : 'Leave party?',
      isLeader
        ? 'Leadership will transfer to the longest-standing member. An empty party is deleted.'
        : 'You can rejoin later with a new invite.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => void run(leaveParty) },
      ],
    );
  }

  async function handleSend() {
    const body = message.trim();
    if (!body) return;
    if (await sendMessage(body)) setMessage('');
  }

  async function handleSearch() {
    setSearching(true);
    setSearchResults(await searchPlayers(searchQuery));
    setSearching(false);
  }

  async function handleAddFriend(profileId: string) {
    const success = await run(() => sendFriendRequest(profileId));
    if (success) {
      setSearchResults((current) => current.filter((item) => item.id !== profileId));
    }
  }

  function openFinder() {
    setSearchQuery('');
    setSearchResults([]);
    setShowFinder(true);
  }

  function confirmRemove(profileId: string, name: string) {
    Alert.alert('Remove friend?', `${name} will be removed from your Ascend roster.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void run(() => removeFriend(profileId)) },
    ]);
  }

  function confirmBlock(profileId: string, name: string) {
    Alert.alert(
      'Block player?',
      `${name} will be removed from your friends and party. Their messages and invitations will be hidden.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => void run(() => blockPlayer(profileId)) },
      ],
    );
  }

  function openMessageSafety(messageId: string, senderId: string, senderName: string) {
    Alert.alert('Message options', `Choose an action for ${senderName}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        onPress: () => Alert.alert('Report message?', 'This sends the message to Ascend moderation for review.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Report', style: 'destructive', onPress: () => void run(() => reportMessage(messageId, 'harassment')) },
        ]),
      },
      { text: 'Block', style: 'destructive', onPress: () => confirmBlock(senderId, senderName) },
    ]);
  }

  const finderProfiles = searchQuery.trim() ? searchResults : suggestions;

  if (!available) {
    const servicesMissing = authStatus === 'unconfigured';

    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.connectScreen}>
          <Text style={styles.connectIcon}>◇</Text>
          <Text style={styles.connectTitle}>
            {servicesMissing
              ? 'Online services are missing from this build'
              : 'Enable your online Ascendant'}
          </Text>
          <Text style={styles.connectText}>
            {servicesMissing
              ? 'Rebuild Ascend with its public Supabase URL and publishable key to enable friends, party chat, presence, and synchronized raids.'
              : 'Ascend creates a private authenticated player ID for friends, party chat, presence, and synchronized raids. You can link an email later.'}
          </Text>
          {!servicesMissing && (
            <Pressable
              style={styles.primaryButton}
              onPress={() => void enableOnlineAccount()}
              disabled={authStatus === 'connecting' || authStatus === 'checking'}
            >
              {authStatus === 'connecting' || authStatus === 'checking' ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>ENABLE ONLINE PLAY</Text>
              )}
            </Pressable>
          )}
          {(authError || errorMessage) && (
            <Text style={styles.error}>{authError ?? errorMessage}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor="#8B7CFF" />}
      >
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.eyebrow}>LIVE SOCIAL HUB</Text>
            <Text style={styles.title}>Your party</Text>
          </View>
          {loading && <ActivityIndicator color="#8B7CFF" />}
        </View>
        <Text style={styles.subtitle}>
          Presence, invitations, and chat now sync through your authenticated account.
        </Text>

        <View style={styles.partyCard}>
          <View style={styles.partyTop}>
            <View>
              <Text style={styles.partyEyebrow}>{party ? 'ACTIVE RAID PARTY' : 'PARTY SLOT OPEN'}</Text>
              <Text style={styles.partyName}>{party?.name ?? 'Create or join a party'}</Text>
              <Text style={styles.partyTitle}>{party ? party.members.length : 1} / 4 ASCENDANTS</Text>
            </View>
            <View>
              <Text style={styles.partyPower}>{partyPower.toLocaleString()}</Text>
              <Text style={styles.partyPowerLabel}>TEAM POWER</Text>
            </View>
          </View>
          <View style={styles.avatarRow}>
            <Avatar name={characterName} characterClass={characterClass} source={gear.source} online />
            {partyMembers.map((member) => (
              <Avatar key={member.id} name={member.name} characterClass={member.characterClass} online={member.isOnline} />
            ))}
            {Array.from({ length: 3 - partyMembers.length }).map((_, index) => (
              <EmptyAvatar key={index} />
            ))}
          </View>
          {party && <Text style={styles.inviteCode}>INVITE CODE · {party.inviteCode}</Text>}
          <View style={styles.actionRow}>
            <Pressable style={styles.primaryButton} onPress={() => setShowParty(true)}>
              <Text style={styles.primaryButtonText}>{party ? 'OPEN PARTY HQ' : 'CREATE OR JOIN'}</Text>
            </Pressable>
            {party && (
              <Pressable
                style={styles.secondaryButton}
                onPress={() => void Share.share({ message: `Join ${party.name} in Ascend with code ${party.inviteCode}.`, title: 'Ascend party invite' })}
              >
                <Text style={styles.secondaryButtonText}>SHARE</Text>
              </Pressable>
            )}
          </View>
        </View>

        {(errorMessage || authError) && <Text style={styles.error}>{errorMessage ?? authError}</Text>}

        {!party && incomingPartyInvites.length > 0 && (
          <>
            <Section label="PARTY INVITES" title={`Invitations · ${incomingPartyInvites.length}`} />
            {incomingPartyInvites.map((invite) => (
              <View key={invite.id} style={styles.invitationCard}>
                <View style={styles.profileCopy}>
                  <Text style={styles.profileName}>{invite.partyName}</Text>
                  <Text style={styles.profileStatus}>{invite.inviterName} invited you to join.</Text>
                </View>
                <View style={styles.inviteActions}>
                  <Pressable onPress={() => void run(() => respondPartyInvite(invite.id, false))}>
                    <Text style={styles.declineInline}>DECLINE</Text>
                  </Pressable>
                  <Pressable style={styles.cardAction} onPress={() => void run(() => respondPartyInvite(invite.id, true))}>
                    <Text style={styles.cardActionText}>JOIN</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        {incomingRequests.length > 0 && (
          <>
            <Section label="INCOMING" title={`Requests · ${incomingRequests.length}`} />
            {incomingRequests.map((request) => (
              <View key={request.id}>
                <ProfileCard
                  profile={request.profile}
                  action="ACCEPT"
                  onAction={() => void run(() => acceptFriendRequest(request.id))}
                />
                <Pressable onPress={() => void run(() => declineFriendRequest(request.id))}>
                  <Text style={styles.declineAction}>DECLINE REQUEST</Text>
                </Pressable>
              </View>
            ))}
          </>
        )}

        {outgoingRequests.length > 0 && (
          <>
            <Section label="OUTGOING" title={`Pending · ${outgoingRequests.length}`} />
            {outgoingRequests.map((request) => (
              <ProfileCard
                key={request.id}
                profile={{ ...request.profile, status: 'Friend request pending' }}
                action="CANCEL"
                onAction={() => void run(() => cancelFriendRequest(request.id))}
              />
            ))}
          </>
        )}

        <Section
          label="PERSISTENT ROSTER"
          title={`Friends · ${friends.length}`}
          action="FIND PLAYERS"
          onAction={openFinder}
        />
        <ProfileCard
          profile={{
            id: user?.id ?? 'you',
            name: `${characterName} · YOU`,
            handle: profile?.handle,
            characterClass,
            level,
            status: isLeader ? 'Party leader' : 'Ready to ascend',
            isOnline: true,
            weeklyXp: totalXp,
            raidContribution: 1250,
          }}
          action={profile?.handle ? 'SHARE' : undefined}
          onAction={profile?.handle ? () => void Share.share({
            message: `Add me on Ascend: @${profile.handle}`,
            title: 'My Ascend handle',
          }) : undefined}
        />
        {friends.map((friend) => (
          <View key={friend.id}>
            <ProfileCard
              profile={friend}
              action={party && isLeader && !partyMembers.some((member) => member.id === friend.id) ? 'INVITE' : 'REMOVE'}
              onAction={() => {
                if (party && isLeader && !partyMembers.some((member) => member.id === friend.id)) {
                  void run(() => inviteToParty(friend.id));
                } else {
                  confirmRemove(friend.id, friend.name);
                }
              }}
            />
            <Pressable onPress={() => confirmBlock(friend.id, friend.name)} accessibilityRole="button">
              <Text style={styles.blockAction}>BLOCK PLAYER</Text>
            </Pressable>
          </View>
        ))}
        {friends.length === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Your roster is ready</Text>
            <Text style={styles.emptyText}>Find a player by browsing active Ascendants, then send a friend request.</Text>
          </View>
        )}
        {blockedUserIds.length > 0 && (
          <View style={styles.safetyCard}>
            <Text style={styles.safetyTitle}>BLOCKED PLAYERS</Text>
            <Text style={styles.safetyText}>Blocked players cannot appear in your roster, invitations, or party chat.</Text>
            {blockedUserIds.map((blockedId) => (
              <View key={blockedId} style={styles.blockedRow}>
                <Text style={styles.blockedId}>PLAYER · {blockedId.slice(0, 8).toUpperCase()}</Text>
                <Pressable onPress={() => void run(() => unblockPlayer(blockedId))}>
                  <Text style={styles.unblockAction}>UNBLOCK</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal visible={showParty} transparent animationType="slide" onRequestClose={() => setShowParty(false)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeading}>
              <View><Text style={styles.eyebrow}>PARTY SERVICES</Text><Text style={styles.modalTitle}>Party HQ</Text></View>
              <Pressable onPress={() => setShowParty(false)}><Text style={styles.close}>CLOSE</Text></Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {!party ? (
                <>
                  <Text style={styles.fieldLabel}>CREATE A PARTY</Text>
                  <TextInput value={partyName} onChangeText={setPartyName} style={styles.input} placeholder="Party name" placeholderTextColor="#626A7C" maxLength={24} />
                  <Pressable style={styles.primaryButton} onPress={() => void handleCreate()} disabled={busy}>
                    <Text style={styles.primaryButtonText}>CREATE PARTY</Text>
                  </Pressable>
                  <Text style={styles.fieldLabel}>JOIN WITH CODE</Text>
                  <TextInput value={inviteCode} onChangeText={setInviteCode} autoCapitalize="characters" style={styles.input} placeholder="8-character invite code" placeholderTextColor="#626A7C" maxLength={8} />
                  <Pressable style={styles.secondaryWideButton} onPress={() => void handleJoin()} disabled={busy || inviteCode.trim().length !== 8}>
                    <Text style={styles.secondaryButtonText}>JOIN PARTY</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.fieldLabel}>ACTIVE MEMBERS</Text>
                  {party.members.map((member) => (
                    <View key={member.id} style={styles.memberRow}>
                      <Image source={member.id === user?.id ? gear.source : CLASS_SPRITES[member.characterClass]} style={styles.memberImage} resizeMode="contain" />
                      <View style={styles.memberCopy}>
                        <Text style={styles.memberName}>{member.name}{member.id === user?.id ? ' · YOU' : ''}</Text>
                        <Text style={[styles.memberState, member.isOnline && styles.online]}>{member.isOnline ? '● ONLINE' : '○ OFFLINE'} · {member.characterClass.toUpperCase()}</Text>
                      </View>
                      {isLeader && member.id !== user?.id && (
                        <Pressable onPress={() => void run(() => removePartyMember(member.id))}><Text style={styles.remove}>REMOVE</Text></Pressable>
                      )}
                    </View>
                  ))}
                  <Text style={styles.fieldLabel}>PARTY CHAT</Text>
                  <View style={styles.chat}>
                    {messages.length === 0 && <Text style={styles.emptyText}>No messages yet.</Text>}
                    {messages.map((item) => {
                      const isYou = item.senderId === user?.id;
                      return (
                        <Pressable
                          key={item.id}
                          style={[styles.messageBubble, isYou && styles.messageBubbleYou]}
                          onLongPress={isYou ? undefined : () => openMessageSafety(
                            item.id,
                            item.senderId,
                            profileById.get(item.senderId)?.name ?? 'this player',
                          )}
                          accessibilityHint={isYou ? undefined : 'Long press for report and block options'}
                        >
                          <Text style={styles.sender}>{isYou ? 'YOU' : (profileById.get(item.senderId)?.name ?? 'ALLY').toUpperCase()}</Text>
                          <Text style={styles.messageText}>{item.text}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View style={styles.composer}>
                    <TextInput value={message} onChangeText={setMessage} style={[styles.input, styles.messageInput]} placeholder="Message your party…" placeholderTextColor="#626A7C" maxLength={280} onSubmitEditing={() => void handleSend()} />
                    <Pressable style={styles.sendButton} onPress={() => void handleSend()} disabled={!message.trim()}><Text style={styles.primaryButtonText}>SEND</Text></Pressable>
                  </View>
                  <Pressable style={styles.leaveButton} onPress={confirmLeave}><Text style={styles.leaveText}>LEAVE PARTY</Text></Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showFinder} transparent animationType="slide" onRequestClose={() => setShowFinder(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.finderCard]}>
            <View style={styles.modalHeading}>
              <View><Text style={styles.eyebrow}>PLAYER FINDER</Text><Text style={styles.modalTitle}>Find Ascendants</Text></View>
              <Pressable onPress={() => setShowFinder(false)}><Text style={styles.close}>CLOSE</Text></Pressable>
            </View>
            <View style={styles.searchRow}>
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => void handleSearch()}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={[styles.input, styles.searchInput]}
                placeholder="Search @handle or name"
                placeholderTextColor="#626A7C"
                maxLength={24}
              />
              <Pressable style={styles.searchButton} onPress={() => void handleSearch()} disabled={searching}>
                {searching ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>SEARCH</Text>}
              </Pressable>
            </View>
            <Text style={styles.searchHint}>
              {searchQuery.trim() ? 'SEARCH RESULTS' : 'RECENTLY ACTIVE PLAYERS'}
            </Text>
            <ScrollView keyboardShouldPersistTaps="handled">
              {finderProfiles.map((suggestion) => (
                <ProfileCard key={suggestion.id} profile={suggestion} action="ADD" onAction={() => void handleAddFriend(suggestion.id)} />
              ))}
              {!searching && finderProfiles.length === 0 && <Text style={styles.emptyText}>No matching players are available. Check the handle and try again.</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Avatar({ name, characterClass, source, online }: { name: string; characterClass: FriendProfile['characterClass']; source?: any; online: boolean }) {
  return <View style={styles.avatarSlot}><View style={[styles.avatar, { borderColor: CHARACTER_CLASSES[characterClass].color }]}><Image source={source ?? CLASS_SPRITES[characterClass]} style={styles.avatarImage} resizeMode="contain" /><View style={[styles.presence, !online && styles.presenceOffline]} /></View><Text style={styles.avatarName} numberOfLines={1}>{name}</Text></View>;
}

function EmptyAvatar() {
  return <View style={styles.avatarSlot}><View style={[styles.avatar, styles.emptyAvatar]}><Text style={styles.plus}>+</Text></View><Text style={styles.avatarName}>OPEN</Text></View>;
}

function Section({ label, title, action, onAction }: { label: string; title: string; action?: string; onAction?: () => void }) {
  return <View style={styles.section}><View><Text style={styles.sectionLabel}>{label}</Text><Text style={styles.sectionTitle}>{title}</Text></View>{action && <Pressable style={styles.sectionAction} onPress={onAction}><Text style={styles.sectionActionText}>{action}</Text></Pressable>}</View>;
}

function ProfileCard({ profile, action, onAction }: { profile: FriendProfile; action?: string; onAction?: () => void }) {
  const classInfo = CHARACTER_CLASSES[profile.characterClass];
  return <View style={styles.profileCard}><View style={[styles.profilePortrait, { borderColor: `${classInfo.color}99` }]}><Image source={CLASS_SPRITES[profile.characterClass]} style={styles.profileImage} resizeMode="contain" /></View><View style={styles.profileCopy}><View style={styles.profileNameRow}><Text style={styles.profileName}>{profile.name}</Text><Text style={[styles.profileClass, { color: classInfo.color }]}>{profile.characterClass.toUpperCase()}</Text></View>{profile.handle && <Text style={styles.handle}>@{profile.handle}</Text>}<Text style={[styles.profileStatus, profile.isOnline && styles.online]}>{profile.isOnline ? '● ONLINE · ' : ''}{profile.status}</Text><Text style={styles.metrics}>LV {profile.level} · {profile.weeklyXp.toLocaleString()} XP · {profile.raidContribution.toLocaleString()} DMG</Text></View>{action && <Pressable style={styles.cardAction} onPress={onAction}><Text style={styles.cardActionText}>{action}</Text></Pressable>}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D14' },
  content: { padding: 20, paddingBottom: 48 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#8B7CFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 3 },
  subtitle: { color: '#8F96A8', fontSize: 12, lineHeight: 18, marginTop: 7 },
  connectScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  connectIcon: { color: '#8B7CFF', fontSize: 50 },
  connectTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 12 },
  connectText: { color: '#9098AA', fontSize: 12, lineHeight: 19, textAlign: 'center', maxWidth: 350, marginTop: 10, marginBottom: 22 },
  partyCard: { backgroundColor: '#151827', borderWidth: 1, borderColor: '#383263', borderRadius: 22, padding: 16, marginTop: 20 },
  partyTop: { flexDirection: 'row', justifyContent: 'space-between' },
  partyEyebrow: { color: '#8B7CFF', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  partyName: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', marginTop: 4 },
  partyTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', marginTop: 4 },
  partyPower: { color: '#FF9D66', fontSize: 22, fontWeight: '900', textAlign: 'right' },
  partyPowerLabel: { color: '#777F91', fontSize: 7, fontWeight: '900', textAlign: 'right' },
  avatarRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  avatarSlot: { width: '23%', alignItems: 'center' },
  avatar: { width: 58, height: 58, borderRadius: 18, borderWidth: 1, backgroundColor: '#202334', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarName: { color: '#A7ADBA', fontSize: 8, fontWeight: '800', marginTop: 5, maxWidth: 68 },
  presence: { position: 'absolute', right: 4, bottom: 4, width: 9, height: 9, borderRadius: 5, backgroundColor: '#54D68A', borderWidth: 2, borderColor: '#151827' },
  presenceOffline: { backgroundColor: '#596174' },
  emptyAvatar: { borderColor: '#3A4052', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  plus: { color: '#6F778A', fontSize: 24 },
  inviteCode: { color: '#AFA7FF', fontSize: 9, fontWeight: '900', letterSpacing: 1, textAlign: 'center', marginTop: 16 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  primaryButton: { flex: 1, minHeight: 48, borderRadius: 13, backgroundColor: '#635BFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  secondaryButton: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: '#454B60', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  secondaryButtonText: { color: '#C2C7D3', fontSize: 9, fontWeight: '900' },
  error: { color: '#FF9EAD', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 12 },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 28, marginBottom: 11 },
  sectionLabel: { color: '#777F91', fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  sectionTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginTop: 2 },
  sectionAction: { borderWidth: 1, borderColor: '#41475A', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 },
  sectionActionText: { color: '#C1C6D3', fontSize: 8, fontWeight: '900' },
  profileCard: { minHeight: 94, flexDirection: 'row', alignItems: 'center', backgroundColor: '#151827', borderWidth: 1, borderColor: '#292D3D', borderRadius: 17, padding: 10, marginBottom: 9 },
  invitationCard: { minHeight: 74, flexDirection: 'row', alignItems: 'center', backgroundColor: '#181A2B', borderWidth: 1, borderColor: '#6259B8', borderRadius: 16, padding: 12, marginBottom: 9 },
  profilePortrait: { width: 60, height: 70, borderRadius: 14, borderWidth: 1, overflow: 'hidden', backgroundColor: '#202334' },
  profileImage: { width: '100%', height: '100%' },
  profileCopy: { flex: 1, marginLeft: 11 },
  profileNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  profileName: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', flexShrink: 1 },
  profileClass: { fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  handle: { color: '#777F91', fontSize: 8, marginTop: 2 },
  profileStatus: { color: '#939AAC', fontSize: 9, marginTop: 4 },
  metrics: { color: '#6F778A', fontSize: 7, fontWeight: '900', marginTop: 6 },
  cardAction: { borderRadius: 8, backgroundColor: '#4E479E', paddingHorizontal: 9, paddingVertical: 8, marginLeft: 7 },
  cardActionText: { color: '#FFFFFF', fontSize: 7, fontWeight: '900' },
  declineAction: { alignSelf: 'flex-end', color: '#D47E8F', fontSize: 7, fontWeight: '900', marginBottom: 8, marginRight: 4, padding: 6 },
  blockAction: { alignSelf: 'flex-end', color: '#B86F80', fontSize: 7, fontWeight: '900', letterSpacing: 0.6, marginBottom: 8, marginRight: 4, padding: 6 },
  inviteActions: { alignItems: 'flex-end', gap: 4 },
  declineInline: { color: '#D47E8F', fontSize: 7, fontWeight: '900', padding: 4 },
  emptyCard: { borderWidth: 1, borderColor: '#34394A', borderStyle: 'dashed', borderRadius: 16, padding: 22, alignItems: 'center' },
  safetyCard: { marginTop: 18, borderWidth: 1, borderColor: '#473443', borderRadius: 16, backgroundColor: '#17131B', padding: 14 },
  safetyTitle: { color: '#D58A9A', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  safetyText: { color: '#8D8491', fontSize: 9, lineHeight: 14, marginTop: 4 },
  blockedRow: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#342A35', marginTop: 9, paddingTop: 9 },
  blockedId: { color: '#A8A0AD', fontSize: 8, fontWeight: '800' },
  unblockAction: { color: '#8B7CFF', fontSize: 8, fontWeight: '900', letterSpacing: 0.7, padding: 5 },
  emptyTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  emptyText: { color: '#81899B', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 5 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(4,5,10,0.84)' },
  modalCard: { maxHeight: '91%', minHeight: 460, backgroundColor: '#10131D', borderTopLeftRadius: 26, borderTopRightRadius: 26, borderWidth: 1, borderColor: '#2B2F42', padding: 18, paddingBottom: 32 },
  finderCard: { minHeight: 400 },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchInput: { flex: 1, marginBottom: 0 },
  searchButton: { width: 76, minHeight: 46, borderRadius: 12, backgroundColor: '#635BFF', alignItems: 'center', justifyContent: 'center' },
  searchHint: { color: '#777F91', fontSize: 8, fontWeight: '900', letterSpacing: 1.1, marginTop: 15, marginBottom: 9 },
  modalHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', marginTop: 3 },
  close: { color: '#969DAE', fontSize: 9, fontWeight: '900', padding: 8 },
  fieldLabel: { color: '#7D8597', fontSize: 8, fontWeight: '900', letterSpacing: 1.2, marginTop: 15, marginBottom: 8 },
  input: { minHeight: 46, borderRadius: 12, backgroundColor: '#191C29', borderWidth: 1, borderColor: '#303548', color: '#FFFFFF', paddingHorizontal: 13, marginBottom: 9 },
  secondaryWideButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: '#454B60', alignItems: 'center', justifyContent: 'center' },
  memberRow: { minHeight: 62, borderRadius: 13, backgroundColor: '#181B27', flexDirection: 'row', alignItems: 'center', padding: 8, marginBottom: 7 },
  memberImage: { width: 46, height: 48 },
  memberCopy: { flex: 1, marginLeft: 9 },
  memberName: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  memberState: { color: '#747C90', fontSize: 7, fontWeight: '900', marginTop: 3 },
  online: { color: '#54D68A' },
  remove: { color: '#D47E8F', fontSize: 7, fontWeight: '900', padding: 8 },
  chat: { minHeight: 130, maxHeight: 280, borderRadius: 15, backgroundColor: '#0C0E16', borderWidth: 1, borderColor: '#272B3A', padding: 10, gap: 8 },
  messageBubble: { alignSelf: 'flex-start', maxWidth: '86%', backgroundColor: '#212432', borderRadius: 11, padding: 9 },
  messageBubbleYou: { alignSelf: 'flex-end', backgroundColor: '#5149A5' },
  sender: { color: '#A9AFFF', fontSize: 6, fontWeight: '900', marginBottom: 3 },
  messageText: { color: '#FFFFFF', fontSize: 10, lineHeight: 15 },
  composer: { flexDirection: 'row', gap: 8, marginTop: 9 },
  messageInput: { flex: 1, marginBottom: 0 },
  sendButton: { width: 62, borderRadius: 12, backgroundColor: '#635BFF', alignItems: 'center', justifyContent: 'center' },
  leaveButton: { minHeight: 43, borderRadius: 11, borderWidth: 1, borderColor: '#573842', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  leaveText: { color: '#D17487', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
});
