import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { APPEARANCES, getAvatarEvolution } from '../game/appearanceData';
import { CHARACTER_CLASSES, getDailyQuests, getLevelProgress, StatName } from '../game/gameData';
import {
  GEAR_SETS,
  GearSetDefinition,
  getEquippedGearSet,
} from '../game/gearData';
import { SKILL_TREES } from '../game/skillData';
import { useGame } from '../state/GameContext';
import { useAuth } from '../state/AuthContext';
import { useMusic } from '../state/MusicContext';
import GameIcon from '../components/GameIcon';

const statLabels: readonly { id: StatName; label: string }[] = [
  { id: 'strength', label: 'Strength' },
  { id: 'endurance', label: 'Endurance' },
  { id: 'intelligence', label: 'Intelligence' },
  { id: 'mindfulness', label: 'Mindfulness' },
  { id: 'vitality', label: 'Vitality' },
];

export default function ProfileScreen() {
  const {
    appearanceId,
    characterClass,
    characterName,
    completedQuestIds,
    equipGearSet,
    equippedGearSetId,
    raidWins,
    questStreak,
    resetProgress,
    storageError,
    stats,
    totalXp,
    unlockedSkillIds,
  } = useGame();
  const {
    errorMessage: authError,
    sendEmailLink,
    status: authStatus,
    user,
  } = useAuth();
  const {
    currentTrackTitle,
    enabled: musicEnabled,
    errorMessage: musicError,
    playTrack,
    setEnabled: setMusicEnabled,
    setVolume: setMusicVolume,
    volume: musicVolume,
  } = useMusic();
  const level = getLevelProgress(totalXp);
  const evolution = getAvatarEvolution(characterClass, level.level);
  const classInfo = CHARACTER_CLASSES[characterClass];
  const skillTotal = SKILL_TREES[characterClass].length;
  const questTotal = getDailyQuests(characterClass).length;
  const equippedGear = getEquippedGearSet(characterClass, equippedGearSetId);
  const unlockedGearTotal = GEAR_SETS[characterClass].filter(
    (gear) => level.level >= gear.unlockLevel,
  ).length;
  const [showGearLocker, setShowGearLocker] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  useFocusEffect(useCallback(() => playTrack('sanctuary'), [playTrack]));

  function handleEquip(gear: GearSetDefinition) {
    if (!equipGearSet(gear.id)) {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      ).catch(() => undefined);
      return;
    }
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
  }

  function confirmReset() {
    Alert.alert(
      'Reset Ascendant?',
      'This removes local XP, quests, skills, raid progress, and onboarding progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: resetProgress },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>ASCENDANT PROFILE</Text>
        <Text style={styles.title}>{characterName}</Text>

        <View style={[styles.heroCard, { borderColor: `${APPEARANCES[appearanceId].accent}70` }]}>
          <View style={[styles.heroGlow, { backgroundColor: APPEARANCES[appearanceId].accent }]} />
          <Image
            source={equippedGear.source}
            style={[
              styles.heroImage,
              {
                transform: [
                  { scale: evolution.scale },
                  { scaleX: evolution.widthScale },
                ],
              },
            ]}
            resizeMode="contain"
          />
          <View style={styles.heroDetails}>
            <Text style={[styles.classLabel, { color: classInfo.color }]}>{characterClass.toUpperCase()}</Text>
            <Text style={styles.levelLabel}>LEVEL {level.level}</Text>
            <Text style={[styles.formLabel, { color: classInfo.color }]}>FORM {evolution.stage + 1} · {evolution.name.toUpperCase()}</Text>
            <Text style={styles.auraLabel}>{APPEARANCES[appearanceId].name.toUpperCase()} AURA</Text>
            <Text style={[styles.gearLabel, { color: equippedGear.accent }]}>{equippedGear.name.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.xpCard}>
          <View style={styles.xpLabels}>
            <Text style={styles.xpTitle}>GLOBAL ASCENSION</Text>
            <Text style={styles.xpValue}>{level.currentXp} / {level.xpForNextLevel} XP</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: level.progressPercent }]} />
          </View>
        </View>

        <SectionTitle eyebrow="CHARACTER BUILD" title="Core stats" />
        <View style={styles.statsCard}>
          {statLabels.map((stat, index) => (
            <View key={stat.id} style={[styles.statRow, index === statLabels.length - 1 && styles.lastRow]}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <View style={styles.statTrack}><View style={[styles.statFill, { width: `${Math.min(100, stats[stat.id] * 9)}%`, backgroundColor: stat.id === classInfo.focus ? classInfo.color : '#635BFF' }]} /></View>
              <Text style={styles.statNumber}>{stats[stat.id]}</Text>
            </View>
          ))}
        </View>

        <SectionTitle eyebrow="MILESTONES" title="Progress record" />
        <View style={styles.recordGrid}>
          <Record value={`${completedQuestIds.length}/${questTotal}`} label="QUESTS TODAY" />
          <Record value={`${unlockedSkillIds.length}/${skillTotal}`} label="SKILLS" />
          <Record value={String(raidWins)} label="RAIDS DEFEATED" />
          <Record value={`${questStreak} days`} label="QUEST STREAK" />
          <Record value={totalXp.toLocaleString()} label="TOTAL XP" />
          <Record value={`${unlockedGearTotal}/${GEAR_SETS[characterClass].length}`} label="GEAR SETS" />
        </View>

        <SectionTitle eyebrow="HONORS" title="Achievements" />
        <View style={styles.achievementsCard}>
          <Achievement
            title="First Step"
            description="Complete your first daily quest"
            unlocked={completedQuestIds.length > 0 || totalXp > 0}
          />
          <Achievement
            title="Skill Awakened"
            description="Unlock a class skill with earned points"
            unlocked={unlockedSkillIds.length > 1}
          />
          <Achievement
            title="Wyrmbreaker"
            description="Defeat the Iron Wyrm raid boss"
            unlocked={raidWins > 0}
            last
          />
        </View>

        <SectionTitle eyebrow="COLLECTION" title="Equipment" />
        <View style={[styles.loadoutCard, { borderColor: `${equippedGear.accent}70` }]}>
          <Image source={equippedGear.source} style={styles.loadoutImage} resizeMode="contain" />
          <View style={styles.loadoutInfo}>
            <Text style={[styles.loadoutRarity, { color: equippedGear.accent }]}>{equippedGear.rarity.toUpperCase()} LOADOUT</Text>
            <Text style={styles.loadoutName}>{equippedGear.name}</Text>
            <Text style={styles.loadoutItem}>ARMOR · {equippedGear.armorName}</Text>
            <Text style={styles.loadoutItem}>WEAPON · {equippedGear.weaponName}</Text>
            <Text style={styles.loadoutBonus}>{equippedGear.bonusText}</Text>
            <Pressable
              style={styles.openLockerButton}
              onPress={() => setShowGearLocker(true)}
              accessibilityRole="button"
            >
              <Text style={styles.openLockerText}>OPEN GEAR LOCKER</Text>
            </Pressable>
          </View>
        </View>

        <SectionTitle eyebrow="AUDIO" title="Soundtrack" />
        <View style={styles.soundtrackCard}>
          <View style={styles.soundtrackHeader}>
            <View style={styles.soundtrackIdentity}>
              <GameIcon token="progress-xp" size={36} />
              <View>
                <Text style={styles.soundtrackTitle}>ORIGINAL SOUNDTRACK</Text>
                <Text style={styles.soundtrackNowPlaying} numberOfLines={1}>
                  {musicEnabled ? currentTrackTitle : 'Music paused'}
                </Text>
              </View>
            </View>
            <Pressable
              style={[styles.musicToggle, musicEnabled && styles.musicToggleEnabled]}
              onPress={() => setMusicEnabled(!musicEnabled)}
              accessibilityRole="switch"
              accessibilityState={{ checked: musicEnabled }}
              accessibilityLabel="Game music"
            >
              <Text style={styles.musicToggleText}>{musicEnabled ? 'ON' : 'OFF'}</Text>
            </Pressable>
          </View>
          <Text style={styles.volumeLabel}>MUSIC VOLUME</Text>
          <View style={styles.volumeRow}>
            {[0.25, 0.5, 0.75, 1].map((option) => {
              const selected = Math.abs(musicVolume - option) < 0.01;
              return (
                <Pressable
                  key={option}
                  style={[styles.volumeButton, selected && styles.volumeButtonSelected]}
                  onPress={() => setMusicVolume(option)}
                  disabled={!musicEnabled}
                  accessibilityRole="button"
                  accessibilityState={{ selected, disabled: !musicEnabled }}
                >
                  <Text style={[styles.volumeButtonText, selected && styles.volumeButtonTextSelected]}>
                    {Math.round(option * 100)}%
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {musicError && <Text style={styles.musicError}>{musicError}</Text>}
        </View>
        <SectionTitle eyebrow="ACCOUNT" title="Settings" />
        <View style={styles.settingsCard}>
          <Setting label="Quest Validation" value="Timers, counters & checklists" />
          <Setting label="Privacy" value="No health or usage access" />
          <Setting
            label="Local Storage"
            value={storageError ? 'Needs attention' : 'Saving normally'}
          />
          <Setting
            label="Account"
            value={
              authStatus === 'authenticated'
                ? user?.is_anonymous
                  ? 'Online guest'
                  : user?.email ?? 'Online account'
                : 'On-device profile'
            }
            last
          />
        </View>

        {authStatus === 'authenticated' && user?.is_anonymous && (
          <Pressable style={styles.accountButton} onPress={() => setShowAccount(true)}>
            <Text style={styles.accountButtonText}>PROTECT ONLINE ACCOUNT</Text>
          </Pressable>
        )}

        {storageError && <Text style={styles.storageError}>{storageError}</Text>}

        <Pressable style={styles.resetButton} onPress={confirmReset} accessibilityRole="button">
          <Text style={styles.resetText}>RESET LOCAL DATA</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={showGearLocker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGearLocker(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setShowGearLocker(false)}
          />
          <View style={styles.gearModal}>
            <View style={styles.modalHandle} />
            <View style={styles.gearModalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>{characterClass.toUpperCase()} ARSENAL</Text>
                <Text style={styles.modalTitle}>Gear locker</Text>
              </View>
              <Pressable onPress={() => setShowGearLocker(false)}>
                <Text style={styles.modalClose}>CLOSE</Text>
              </Pressable>
            </View>
            <Text style={styles.modalSubtitle}>
              Armor and weapons unlock automatically as your Ascendant levels up.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.gearList}>
              {GEAR_SETS[characterClass].map((gear) => (
                <GearOption
                  key={gear.id}
                  gear={gear}
                  currentLevel={level.level}
                  equipped={gear.id === equippedGearSetId}
                  onEquip={() => handleEquip(gear)}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showAccount}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAccount(false)}
      >
        <View style={styles.accountBackdrop}>
          <View style={styles.accountModal}>
            <Text style={styles.modalEyebrow}>ACCOUNT RECOVERY</Text>
            <Text style={styles.modalTitle}>Link your email</Text>
            <Text style={styles.accountDescription}>
              Guest accounts are tied to this installation. Link an email so
              your friends and party can survive a reinstall or new phone.
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#626A7C"
              style={styles.accountInput}
            />
            {(authError || emailSent) && (
              <Text style={emailSent ? styles.accountSuccess : styles.storageError}>
                {emailSent
                  ? 'Verification sent. Open the link on this device.'
                  : authError}
              </Text>
            )}
            <Pressable
              style={styles.accountConfirm}
              onPress={() =>
                void sendEmailLink(email).then((sent) => setEmailSent(sent))
              }
              disabled={!email.includes('@')}
            >
              <Text style={styles.accountButtonText}>SEND VERIFICATION</Text>
            </Pressable>
            <Pressable onPress={() => setShowAccount(false)}>
              <Text style={styles.accountClose}>CLOSE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <View style={styles.sectionTitleWrap}><Text style={styles.sectionEyebrow}>{eyebrow}</Text><Text style={styles.sectionTitle}>{title}</Text></View>;
}

function Record({ value, label }: { value: string; label: string }) {
  return <View style={styles.record}><Text style={styles.recordValue}>{value}</Text><Text style={styles.recordLabel}>{label}</Text></View>;
}

function GearOption({
  gear,
  currentLevel,
  equipped,
  onEquip,
}: {
  gear: GearSetDefinition;
  currentLevel: number;
  equipped: boolean;
  onEquip: () => void;
}) {
  const unlocked = currentLevel >= gear.unlockLevel;
  return (
    <View style={[styles.gearOption, equipped && { borderColor: gear.accent }]}>
      <View style={[styles.gearPreview, { backgroundColor: `${gear.accent}14` }]}>
        <Image
          source={gear.source}
          style={[styles.gearPreviewImage, !unlocked && styles.lockedImage]}
          resizeMode="contain"
        />
        {!unlocked ? (
          <View style={styles.lockBadge}>
            <Text style={styles.lockBadgeText}>LV {gear.unlockLevel}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.gearOptionInfo}>
        <Text style={[styles.gearRarity, { color: gear.accent }]}>{gear.rarity.toUpperCase()}</Text>
        <Text style={styles.gearName}>{gear.name}</Text>
        <Text style={styles.gearPart}>ARMOR · {gear.armorName}</Text>
        <Text style={styles.gearPart}>WEAPON · {gear.weaponName}</Text>
        <Text style={styles.gearDescription}>{gear.description}</Text>
        <Text style={[styles.gearBonus, { color: gear.accent }]}>{gear.bonusText}</Text>
        <Pressable
          style={[
            styles.equipButton,
            equipped && styles.equippedButton,
            !unlocked && styles.lockedButton,
          ]}
          onPress={onEquip}
          disabled={!unlocked || equipped}
          accessibilityRole="button"
          accessibilityState={{ disabled: !unlocked || equipped }}
        >
          <Text style={styles.equipButtonText}>
            {equipped ? 'EQUIPPED' : unlocked ? 'EQUIP SET' : `UNLOCKS AT LEVEL ${gear.unlockLevel}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function Achievement({
  title,
  description,
  unlocked,
  last = false,
}: {
  title: string;
  description: string;
  unlocked: boolean;
  last?: boolean;
}) {
  return (
    <View style={[styles.achievementRow, last && styles.lastRow]}>
      <View style={[styles.achievementIcon, unlocked && styles.achievementIconUnlocked]}>
        <Text style={styles.achievementIconText}>{unlocked ? '◆' : '◇'}</Text>
      </View>
      <View style={styles.achievementInfo}>
        <Text style={[styles.achievementTitle, !unlocked && styles.achievementLocked]}>{title}</Text>
        <Text style={styles.achievementDescription}>{description}</Text>
      </View>
      <Text style={[styles.achievementStatus, unlocked && styles.achievementStatusUnlocked]}>
        {unlocked ? 'EARNED' : 'LOCKED'}
      </Text>
    </View>
  );
}

function Setting({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return <View style={[styles.settingRow, last && styles.lastRow]}><Text style={styles.settingLabel}>{label}</Text><Text style={styles.settingValue}>{value}  ›</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0D14' },
  content: { padding: 20, paddingBottom: 48 },
  eyebrow: { color: '#8B7CFF', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#FFFFFF', fontSize: 30, fontWeight: '900', marginTop: 4 },
  heroCard: { height: 300, backgroundColor: '#151827', borderWidth: 1, borderRadius: 22, overflow: 'hidden', marginTop: 18 },
  heroGlow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, opacity: 0.15, left: 18, top: 36 },
  heroImage: { position: 'absolute', width: '72%', height: 285, left: -5, top: 8 },
  heroDetails: { position: 'absolute', right: 17, top: 95, alignItems: 'flex-end' },
  classLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  levelLabel: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 5 },
  formLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.55, marginTop: 6, maxWidth: 150, textAlign: 'right' },
  auraLabel: { color: '#7F8799', fontSize: 8, fontWeight: '900', letterSpacing: 0.7, marginTop: 6 },
  gearLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7, marginTop: 6, maxWidth: 130, textAlign: 'right' },
  xpCard: { backgroundColor: '#151827', borderWidth: 1, borderColor: '#272B3A', borderRadius: 15, padding: 13, marginTop: 11 },
  xpLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  xpTitle: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  xpValue: { color: '#8B7CFF', fontSize: 9, fontWeight: '900' },
  xpTrack: { height: 6, backgroundColor: '#282C3D', borderRadius: 3, overflow: 'hidden', marginTop: 9 },
  xpFill: { height: '100%', backgroundColor: '#635BFF' },
  sectionTitleWrap: { marginTop: 27, marginBottom: 11 },
  sectionEyebrow: { color: '#747C90', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  sectionTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', marginTop: 2 },
  statsCard: { backgroundColor: '#151827', borderWidth: 1, borderColor: '#272B3A', borderRadius: 17, paddingHorizontal: 14 },
  statRow: { height: 49, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#262A39' },
  lastRow: { borderBottomWidth: 0 },
  statLabel: { color: '#B7BCC8', fontSize: 11, fontWeight: '800', width: 88 },
  statTrack: { flex: 1, height: 5, backgroundColor: '#282C3B', borderRadius: 3, overflow: 'hidden' },
  statFill: { height: '100%', borderRadius: 3 },
  statNumber: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', width: 30, textAlign: 'right' },
  recordGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 9 },
  record: { width: '31.5%', minHeight: 76, backgroundColor: '#151827', borderWidth: 1, borderColor: '#272B3A', borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 7 },
  recordValue: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  recordLabel: { color: '#747C90', fontSize: 7, fontWeight: '900', textAlign: 'center', letterSpacing: 0.6, marginTop: 5 },
  loadoutCard: { minHeight: 206, flexDirection: 'row', backgroundColor: '#151827', borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  loadoutImage: { width: '43%', height: 205, alignSelf: 'flex-end' },
  loadoutInfo: { flex: 1, justifyContent: 'center', paddingRight: 14, paddingVertical: 14 },
  loadoutRarity: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  loadoutName: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 3 },
  loadoutItem: { color: '#9AA1B2', fontSize: 8, fontWeight: '800', marginTop: 6 },
  loadoutBonus: { color: '#54D68A', fontSize: 9, fontWeight: '900', marginTop: 9 },
  openLockerButton: { minHeight: 38, borderRadius: 10, backgroundColor: '#635BFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, marginTop: 12 },
  openLockerText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  achievementsCard: { backgroundColor: '#151827', borderWidth: 1, borderColor: '#272B3A', borderRadius: 17, paddingHorizontal: 13 },
  achievementRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#262A39' },
  achievementIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#202334', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  achievementIconUnlocked: { backgroundColor: '#2B2650', borderWidth: 1, borderColor: '#635BFF' },
  achievementIconText: { color: '#8B7CFF', fontSize: 17 },
  achievementInfo: { flex: 1 },
  achievementTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  achievementLocked: { color: '#777F91' },
  achievementDescription: { color: '#747C90', fontSize: 9, marginTop: 3 },
  achievementStatus: { color: '#5F6678', fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  achievementStatusUnlocked: { color: '#54D68A' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(4,5,10,0.86)' },
  gearModal: { height: '88%', backgroundColor: '#10131D', borderTopLeftRadius: 27, borderTopRightRadius: 27, borderWidth: 1, borderColor: '#2C3041', paddingHorizontal: 18, paddingTop: 10 },
  modalHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: '#42475A', alignSelf: 'center', marginBottom: 14 },
  gearModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalEyebrow: { color: '#8B7CFF', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  modalTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', marginTop: 2 },
  modalClose: { color: '#9299AA', fontSize: 9, fontWeight: '900', padding: 10 },
  modalSubtitle: { color: '#7E8597', fontSize: 10, lineHeight: 15, marginTop: 6 },
  gearList: { paddingTop: 14, paddingBottom: 34, gap: 11 },
  gearOption: { minHeight: 218, flexDirection: 'row', backgroundColor: '#171A26', borderWidth: 1, borderColor: '#2A2E3E', borderRadius: 18, overflow: 'hidden' },
  gearPreview: { width: '42%', minHeight: 218, alignItems: 'center', justifyContent: 'flex-end' },
  gearPreviewImage: { width: '100%', height: 208 },
  lockedImage: { opacity: 0.24 },
  lockBadge: { position: 'absolute', alignSelf: 'center', top: 86, minWidth: 54, height: 31, borderRadius: 10, backgroundColor: 'rgba(7,8,13,0.88)', borderWidth: 1, borderColor: '#555C70', alignItems: 'center', justifyContent: 'center' },
  lockBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  gearOptionInfo: { flex: 1, justifyContent: 'center', padding: 12 },
  gearRarity: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  gearName: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginTop: 3 },
  gearPart: { color: '#A2A8B7', fontSize: 8, fontWeight: '800', marginTop: 5 },
  gearDescription: { color: '#747C90', fontSize: 9, lineHeight: 13, marginTop: 7 },
  gearBonus: { fontSize: 8, fontWeight: '900', marginTop: 7 },
  equipButton: { minHeight: 34, borderRadius: 9, backgroundColor: '#635BFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, marginTop: 10 },
  equippedButton: { backgroundColor: '#294F42' },
  lockedButton: { backgroundColor: '#2B2E3A' },
  equipButtonText: { color: '#FFFFFF', fontSize: 7, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' },
  soundtrackCard: { backgroundColor: '#151827', borderWidth: 1, borderColor: '#34315A', borderRadius: 17, padding: 14, marginBottom: 11 },
  soundtrackHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  soundtrackIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  soundtrackIcon: { color: '#A89CFF', fontSize: 25, marginRight: 11 },
  soundtrackTitle: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.9 },
  soundtrackNowPlaying: { color: '#888FA2', fontSize: 9, marginTop: 3, maxWidth: 220 },
  musicToggle: { minWidth: 49, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#292D3C', borderWidth: 1, borderColor: '#3A3F50' },
  musicToggleEnabled: { backgroundColor: '#4F469E', borderColor: '#8B7CFF' },
  musicToggleText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
  volumeLabel: { color: '#666E81', fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 15, marginBottom: 7 },
  volumeRow: { flexDirection: 'row', gap: 7 },
  volumeButton: { flex: 1, minHeight: 34, borderRadius: 9, borderWidth: 1, borderColor: '#303546', backgroundColor: '#10131D', alignItems: 'center', justifyContent: 'center' },
  volumeButtonSelected: { borderColor: '#8B7CFF', backgroundColor: '#292550' },
  volumeButtonText: { color: '#6E7588', fontSize: 8, fontWeight: '900' },
  volumeButtonTextSelected: { color: '#FFFFFF' },
  musicError: { color: '#FF9EAD', fontSize: 9, marginTop: 9 },
  settingsCard: { backgroundColor: '#151827', borderWidth: 1, borderColor: '#272B3A', borderRadius: 17, paddingHorizontal: 14 },
  settingRow: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#262A39' },
  settingLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  settingValue: { color: '#777F91', fontSize: 10 },
  storageError: { color: '#FF9EAD', fontSize: 10, lineHeight: 15, marginTop: 9 },
  accountButton: { minHeight: 46, borderRadius: 12, backgroundColor: '#635BFF', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  accountButtonText: { color: '#FFFFFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  accountBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(4,5,10,0.86)', padding: 22 },
  accountModal: { width: '100%', maxWidth: 390, borderRadius: 22, borderWidth: 1, borderColor: '#34395A', backgroundColor: '#151827', padding: 20 },
  accountDescription: { color: '#9097A9', fontSize: 11, lineHeight: 17, marginTop: 8 },
  accountInput: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: '#34394A', backgroundColor: '#10131D', color: '#FFFFFF', paddingHorizontal: 13, marginTop: 16 },
  accountConfirm: { minHeight: 46, borderRadius: 12, backgroundColor: '#635BFF', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  accountSuccess: { color: '#54D68A', fontSize: 10, marginTop: 9 },
  accountClose: { color: '#9299AA', fontSize: 9, fontWeight: '900', textAlign: 'center', paddingTop: 16 },
  resetButton: { height: 48, borderWidth: 1, borderColor: '#61383D', borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 22 },
  resetText: { color: '#FF7770', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
