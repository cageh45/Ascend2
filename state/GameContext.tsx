import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  CHARACTER_CLASS_NAMES,
  CHARACTER_CLASSES,
  CharacterClassName,
  getBaseStats,
  getDailyQuests,
  getLevelProgress,
  getPreviousQuestCycleKey,
  getQuestCycleKey,
  getQuestWeekKey,
  getQuestProgressionReward,
  QUESTS,
  QuestId,
  StatName,
} from '../game/gameData';
import {
  canUnlockSkill,
  getEffectiveSkillIds,
  getSkillPoints,
  SKILL_TREES,
} from '../game/skillData';
import {
  APPEARANCE_IDS,
  AppearanceId,
  AvatarCustomization,
  DEFAULT_AVATAR_CUSTOMIZATION,
  EYE_STYLES,
  HAIR_COLORS,
  HAIR_STYLES,
  NOSE_STYLES,
  SKIN_TONES,
} from '../game/appearanceData';
import { FRIEND_PROFILE_IDS } from '../data/socialData';
import {
  DEFAULT_GEAR_SET_IDS,
  GEAR_SET_IDS,
  GearSetId,
  getGearSet,
} from '../game/gearData';
import { DUNGEONS, DungeonId } from '../game/dungeonData';
import { getRaidBoss } from '../game/raidData';
import {
  canClaimRaidReward,
  RaidRewardLedger,
  recordRaidReward,
} from '../game/raidRewardData';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import type { Json } from '../services/database.types';

const STORAGE_KEY = '@ascend/game-state-v1';

type GameState = {
  version: 1;
  onboardingComplete: boolean;
  characterClass: CharacterClassName;
  characterName: string;
  appearanceId: AppearanceId;
  avatarCustomization: AvatarCustomization;
  totalXp: number;
  completedQuestIds: QuestId[];
  questDay: string;
  statGains: Record<StatName, number>;
  raidWins: number;
  completedDungeonIds: DungeonId[];
  dungeonClearCounts: Partial<Record<DungeonId, number>>;
  raidRewardDays: RaidRewardLedger;
  unlockedSkillIds: string[];
  questStreak: number;
  lastQuestCompletionDay: string | null;
  activityHistory: ActivityEntry[];
  questWeek: string;
  weeklyQuestCount: number;
  weeklyXp: number;
  friendIds: string[];
  partyMemberIds: string[];
  equippedGearSetId: GearSetId;
  partyName: string | null;
  partyChatMessages: PartyChatMessage[];
};

export type ActivityEntry = {
  id: string;
  message: string;
  xp: number;
  timestamp: number;
};

export type PartyChatMessage = {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
};

type GameContextValue = {
  hydrated: boolean;
  storageError: string | null;
  onboardingComplete: boolean;
  characterClass: CharacterClassName;
  characterName: string;
  appearanceId: AppearanceId;
  avatarCustomization: AvatarCustomization;
  totalXp: number;
  completedQuestIds: QuestId[];
  stats: Record<StatName, number>;
  raidWins: number;
  completedDungeonIds: DungeonId[];
  dungeonClearCounts: Partial<Record<DungeonId, number>>;
  questCycleKey: string;
  unlockedSkillIds: string[];
  skillPointsAvailable: number;
  questStreak: number;
  recentActivity: ActivityEntry[];
  weeklyQuestCount: number;
  weeklyXp: number;
  questWeekKey: string;
  friendIds: string[];
  partyMemberIds: string[];
  equippedGearSetId: GearSetId;
  partyName: string | null;
  partyChatMessages: PartyChatMessage[];
  completeOnboarding: (
    characterClass: CharacterClassName,
    customization?: AvatarCustomization,
  ) => void;
  updateCharacter: (
    name: string,
    appearanceId: AppearanceId,
    customization?: AvatarCustomization,
  ) => void;
  toggleQuest: (questId: QuestId) => void;
  completeQuest: (questId: QuestId) => void;
  unlockSkill: (skillId: string) => void;
  resetSkills: () => void;
  isRaidRewardAvailable: (dungeonId: DungeonId) => boolean;
  claimRaidVictory: (
    dungeonId: DungeonId,
    bossName?: string,
    rewardXp?: number,
  ) => boolean;
  markDungeonComplete: (dungeonId: DungeonId) => void;
  addFriend: (friendId: string) => boolean;
  removeFriend: (friendId: string) => void;
  togglePartyMember: (friendId: string) => boolean;
  equipGearSet: (gearSetId: GearSetId) => boolean;
  createParty: (name: string) => boolean;
  disbandParty: () => void;
  sendPartyMessage: (text: string, senderId?: string) => void;
  resetProgress: () => void;
};

const zeroStatGains: Record<StatName, number> = {
  strength: 0,
  intelligence: 0,
  mindfulness: 0,
  endurance: 0,
  vitality: 0,
};

function getNextStreak(current: GameState, today: string) {
  if (current.lastQuestCompletionDay === today) return current.questStreak;
  return current.lastQuestCompletionDay === getPreviousQuestCycleKey()
    ? current.questStreak + 1
    : 1;
}

function getActiveStreak(current: GameState, today = getQuestCycleKey()) {
  return current.lastQuestCompletionDay === today ||
    current.lastQuestCompletionDay === getPreviousQuestCycleKey()
    ? current.questStreak
    : 0;
}

function addActivity(
  history: readonly ActivityEntry[],
  message: string,
  xp: number,
) {
  const timestamp = Date.now();
  return [
    { id: `${timestamp}-${message}`, message, xp, timestamp },
    ...history,
  ].slice(0, 20);
}

function createInitialState(): GameState {
  return {
    version: 1,
    onboardingComplete: false,
    characterClass: 'Warrior',
    characterName: 'Ascendant',
    appearanceId: 'violet',
    avatarCustomization: { ...DEFAULT_AVATAR_CUSTOMIZATION },
    totalXp: 0,
    completedQuestIds: [],
    questDay: getQuestCycleKey(),
    statGains: { ...zeroStatGains },
    raidWins: 0,
    completedDungeonIds: [],
    dungeonClearCounts: {},
    raidRewardDays: {},
    unlockedSkillIds: [],
    questStreak: 0,
    lastQuestCompletionDay: null,
    activityHistory: [],
    questWeek: getQuestWeekKey(),
    weeklyQuestCount: 0,
    weeklyXp: 0,
    friendIds: [],
    partyMemberIds: [],
    equippedGearSetId: DEFAULT_GEAR_SET_IDS.Warrior,
    partyName: null,
    partyChatMessages: [],
  };
}

function isCharacterClass(value: unknown): value is CharacterClassName {
  return CHARACTER_CLASS_NAMES.includes(value as CharacterClassName);
}

function isAppearance(value: unknown): value is AppearanceId {
  return APPEARANCE_IDS.includes(value as AppearanceId);
}

function restoreAvatarCustomization(value: unknown): AvatarCustomization {
  const candidate = value && typeof value === 'object'
    ? value as Partial<AvatarCustomization>
    : {};
  return {
    eyeStyle: EYE_STYLES.includes(candidate.eyeStyle as AvatarCustomization['eyeStyle'])
      ? candidate.eyeStyle as AvatarCustomization['eyeStyle']
      : DEFAULT_AVATAR_CUSTOMIZATION.eyeStyle,
    noseStyle: NOSE_STYLES.includes(candidate.noseStyle as AvatarCustomization['noseStyle'])
      ? candidate.noseStyle as AvatarCustomization['noseStyle']
      : DEFAULT_AVATAR_CUSTOMIZATION.noseStyle,
    hairStyle: HAIR_STYLES.includes(candidate.hairStyle as AvatarCustomization['hairStyle'])
      ? candidate.hairStyle as AvatarCustomization['hairStyle']
      : DEFAULT_AVATAR_CUSTOMIZATION.hairStyle,
    hairColor: HAIR_COLORS.includes(candidate.hairColor as AvatarCustomization['hairColor'])
      ? candidate.hairColor as AvatarCustomization['hairColor']
      : DEFAULT_AVATAR_CUSTOMIZATION.hairColor,
    skinTone: SKIN_TONES.includes(candidate.skinTone as AvatarCustomization['skinTone'])
      ? candidate.skinTone as AvatarCustomization['skinTone']
      : DEFAULT_AVATAR_CUSTOMIZATION.skinTone,
  };
}

function restoreDungeonClearCounts(value: unknown, completedIds: unknown) {
  const counts: Partial<Record<DungeonId, number>> = {};
  for (const dungeon of DUNGEONS) {
    const count = value && typeof value === 'object'
      ? (value as Record<string, unknown>)[dungeon.id]
      : undefined;
    if (typeof count === 'number' && Number.isFinite(count) && count > 0) {
      counts[dungeon.id] = Math.floor(count);
    } else if (Array.isArray(completedIds) && completedIds.includes(dungeon.id)) {
      counts[dungeon.id] = 1;
    }
  }
  return counts;
}

function restoreState(value: string | null): GameState {
  if (!value) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(value) as Partial<GameState> & {
      lastRaidRewardDay?: unknown;
    };
    const initial = createInitialState();
    const questIds = new Set<QuestId>(QUESTS.map((quest) => quest.id));
    const isCurrentDay = parsed.questDay === getQuestCycleKey();
    const isCurrentWeek = parsed.questWeek === getQuestWeekKey();
    const characterClass = isCharacterClass(parsed.characterClass)
      ? parsed.characterClass
      : initial.characterClass;
    const validSkillIds = new Set(
      SKILL_TREES[characterClass].map((skill) => skill.id),
    );
    const validFriendIds = new Set(FRIEND_PROFILE_IDS);
    const restoredFriendIds = Array.isArray(parsed.friendIds)
      ? Array.from(
          new Set(
            parsed.friendIds.filter(
              (id): id is string =>
                typeof id === 'string' && validFriendIds.has(id),
            ),
          ),
        )
      : initial.friendIds;
    const restoredGear = GEAR_SET_IDS.includes(
      parsed.equippedGearSetId as GearSetId,
    )
      ? getGearSet(parsed.equippedGearSetId as GearSetId)
      : undefined;

    return {
      ...initial,
      onboardingComplete: parsed.onboardingComplete === true,
      characterClass,
      characterName:
        typeof parsed.characterName === 'string' && parsed.characterName.trim()
          ? parsed.characterName.trim().slice(0, 16)
          : initial.characterName,
      appearanceId: isAppearance(parsed.appearanceId)
        ? parsed.appearanceId
        : initial.appearanceId,
      avatarCustomization: restoreAvatarCustomization(parsed.avatarCustomization),
      totalXp:
        typeof parsed.totalXp === 'number' && parsed.totalXp >= 0
          ? parsed.totalXp
          : 0,
      completedQuestIds:
        isCurrentDay && Array.isArray(parsed.completedQuestIds)
          ? Array.from(
              new Set(
                parsed.completedQuestIds.filter((id): id is QuestId =>
                  questIds.has(id),
                ),
              ),
            )
          : [],
      questDay: getQuestCycleKey(),
      statGains: restoreStatGains(parsed.statGains),
      raidWins:
        typeof parsed.raidWins === 'number' && parsed.raidWins >= 0
          ? Math.floor(parsed.raidWins)
          : 0,
      completedDungeonIds: Array.isArray(parsed.completedDungeonIds)
        ? Array.from(
            new Set(
              parsed.completedDungeonIds.filter(
                (id): id is DungeonId =>
                  typeof id === 'string' &&
                  DUNGEONS.some((dungeon) => dungeon.id === id),
              ),
            ),
          )
        : [],
      dungeonClearCounts: restoreDungeonClearCounts(
        parsed.dungeonClearCounts,
        parsed.completedDungeonIds,
      ),
      raidRewardDays: restoreRaidRewardDays(parsed),
      unlockedSkillIds: Array.isArray(parsed.unlockedSkillIds)
        ? Array.from(
            new Set(
              parsed.unlockedSkillIds.filter(
                (id): id is string =>
                  typeof id === 'string' && validSkillIds.has(id),
              ),
            ),
        )
        : [],
      questStreak:
        typeof parsed.questStreak === 'number' && parsed.questStreak >= 0
          ? Math.floor(parsed.questStreak)
          : 0,
      lastQuestCompletionDay:
        typeof parsed.lastQuestCompletionDay === 'string'
          ? parsed.lastQuestCompletionDay
          : null,
      activityHistory: Array.isArray(parsed.activityHistory)
        ? parsed.activityHistory
            .filter(
              (entry): entry is ActivityEntry =>
                typeof entry?.id === 'string' &&
                typeof entry?.message === 'string' &&
                typeof entry?.xp === 'number' &&
                typeof entry?.timestamp === 'number',
            )
            .slice(0, 20)
        : [],
      questWeek: getQuestWeekKey(),
      weeklyQuestCount:
        isCurrentWeek && typeof parsed.weeklyQuestCount === 'number'
          ? Math.max(0, Math.floor(parsed.weeklyQuestCount))
          : 0,
      weeklyXp:
        isCurrentWeek && typeof parsed.weeklyXp === 'number'
          ? Math.max(0, Math.floor(parsed.weeklyXp))
          : 0,
      friendIds: restoredFriendIds,
      partyMemberIds: [],
      equippedGearSetId:
        restoredGear?.characterClass === characterClass
          ? restoredGear.id
          : DEFAULT_GEAR_SET_IDS[characterClass],
      partyName: null,
      partyChatMessages: [],
    };
  } catch {
    return createInitialState();
  }
}

function restoreStatGains(value: Partial<Record<StatName, number>> | undefined) {
  function restoreStat(stat: StatName) {
    const gain = value?.[stat];
    return typeof gain === 'number' && Number.isFinite(gain)
      ? Math.max(0, gain)
      : 0;
  }

  return {
    strength: restoreStat('strength'),
    intelligence: restoreStat('intelligence'),
    mindfulness: restoreStat('mindfulness'),
    endurance: restoreStat('endurance'),
    vitality: restoreStat('vitality'),
  };
}

function restoreRaidRewardDays(
  parsed: Partial<GameState> & { lastRaidRewardDay?: unknown },
) {
  const restored: RaidRewardLedger = {};
  for (const dungeon of DUNGEONS) {
    const cycleKey = parsed.raidRewardDays?.[dungeon.id];
    if (typeof cycleKey === 'string') restored[dungeon.id] = cycleKey;
  }

  if (
    Object.keys(restored).length === 0 &&
    typeof parsed.lastRaidRewardDay === 'string' &&
    Array.isArray(parsed.activityHistory)
  ) {
    const legacyReward = parsed.activityHistory.find((entry) =>
      DUNGEONS.some(
        (dungeon) =>
          entry?.message === `${getRaidBoss(dungeon.bossId).name} defeated` &&
          typeof entry.timestamp === 'number' &&
          getQuestCycleKey(new Date(entry.timestamp)) === parsed.lastRaidRewardDay,
      ),
    );
    const dungeon = DUNGEONS.find(
      (item) =>
        legacyReward?.message === `${getRaidBoss(item.bossId).name} defeated`,
    );
    if (dungeon) restored[dungeon.id] = parsed.lastRaidRewardDay;
  }

  return restored;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: PropsWithChildren) {
  const { status: authStatus, user } = useAuth();
  const [state, setState] = useState<GameState>(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [questCycleKey, setQuestCycleKey] = useState(getQuestCycleKey);
  const [cloudReadyUserId, setCloudReadyUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function hydrate() {
      try {
        const savedState = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted) {
          setState(restoreState(savedState));
          setStorageError(null);
        }
      } catch {
        if (mounted) {
          setState(createInitialState());
          setStorageError(
            'Saved progress could not be loaded. New progress may not persist.',
          );
        }
      } finally {
        if (mounted) {
          setHydrated(true);
        }
      }
    }

    void hydrate();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const refreshCycle = () => {
      const nextCycleKey = getQuestCycleKey();
      setQuestCycleKey((current) =>
        current === nextCycleKey ? current : nextCycleKey,
      );
    };
    const interval = setInterval(refreshCycle, 15_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (hydrated) {
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))
        .then(() => setStorageError(null))
        .catch(() =>
          setStorageError(
            'Progress could not be saved. Check available device storage.',
          ),
        );
    }
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated || authStatus !== 'authenticated' || !user || !supabase) {
      setCloudReadyUserId(null);
      return;
    }
    let cancelled = false;
    const client = supabase;
    setCloudReadyUserId(null);
    void client
      .from('profiles')
      .select('game_state')
      .eq('id', user.id)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setStorageError(`Cloud save could not be loaded: ${error.message}`);
          return;
        }
        const cloudState = data?.game_state;
        if (cloudState && typeof cloudState === 'object' && !Array.isArray(cloudState)) {
          setState(restoreState(JSON.stringify(cloudState)));
        } else {
          const { error: saveError } = await client
            .from('profiles')
            .update({ game_state: state as unknown as Json })
            .eq('id', user.id);
          if (saveError && !cancelled) {
            setStorageError(`Cloud save could not be created: ${saveError.message}`);
            return;
          }
        }
        if (!cancelled) setCloudReadyUserId(user.id);
      });
    return () => {
      cancelled = true;
    };
  }, [authStatus, hydrated, user?.id]);

  useEffect(() => {
    if (!supabase || !user || cloudReadyUserId !== user.id) return;
    const client = supabase;
    const timer = setTimeout(() => {
      void client
        .from('profiles')
        .update({ game_state: state as unknown as Json })
        .eq('id', user.id)
        .then(({ error }) => {
          if (error) setStorageError(`Cloud save failed: ${error.message}`);
        });
    }, 700);
    return () => clearTimeout(timer);
  }, [cloudReadyUserId, state, user?.id]);

  const value = useMemo<GameContextValue>(() => {
    const dailyQuestIds = new Set<QuestId>(
      getDailyQuests(state.characterClass).map((quest) => quest.id),
    );
    const currentQuestIds =
      state.questDay === questCycleKey
        ? state.completedQuestIds.filter((id) => dailyQuestIds.has(id))
        : [];
    const baseStats = getBaseStats(state.characterClass);
    const level = getLevelProgress(state.totalXp).level;
    const skills = SKILL_TREES[state.characterClass];
    const unlockedSkillIds = getEffectiveSkillIds(
      state.characterClass,
      state.unlockedSkillIds,
    );
    const skillPoints = getSkillPoints(level, skills, unlockedSkillIds);
    const stats = {
      strength: baseStats.strength + state.statGains.strength,
      intelligence: baseStats.intelligence + state.statGains.intelligence,
      mindfulness: baseStats.mindfulness + state.statGains.mindfulness,
      endurance: baseStats.endurance + state.statGains.endurance,
      vitality: baseStats.vitality + state.statGains.vitality,
    };

    return {
      hydrated,
      storageError,
      onboardingComplete: state.onboardingComplete,
      characterClass: state.characterClass,
      characterName: state.characterName,
      appearanceId: state.appearanceId,
      avatarCustomization: state.avatarCustomization,
      totalXp: state.totalXp,
      completedQuestIds: currentQuestIds,
      stats,
      raidWins: state.raidWins,
      completedDungeonIds: state.completedDungeonIds,
      dungeonClearCounts: state.dungeonClearCounts,
      questCycleKey,
      unlockedSkillIds,
      skillPointsAvailable: skillPoints.available,
      questStreak: getActiveStreak(state),
      recentActivity: state.activityHistory,
      weeklyQuestCount:
        state.questWeek === getQuestWeekKey() ? state.weeklyQuestCount : 0,
      weeklyXp: state.questWeek === getQuestWeekKey() ? state.weeklyXp : 0,
      questWeekKey: getQuestWeekKey(),
      friendIds: state.friendIds,
      partyMemberIds: state.partyMemberIds,
      equippedGearSetId: state.equippedGearSetId,
      partyName: state.partyName,
      partyChatMessages: state.partyChatMessages,
      completeOnboarding: (characterClass, customization) => {
        if (!CHARACTER_CLASSES[characterClass]) {
          return;
        }

        setState((current) => ({
          ...current,
          onboardingComplete: true,
          characterClass,
          avatarCustomization: customization
            ? restoreAvatarCustomization(customization)
            : current.avatarCustomization,
          unlockedSkillIds:
            current.characterClass === characterClass
              ? current.unlockedSkillIds
              : [],
          completedQuestIds:
            current.characterClass === characterClass
              ? current.completedQuestIds
              : [],
          equippedGearSetId:
            current.characterClass === characterClass
              ? current.equippedGearSetId
              : DEFAULT_GEAR_SET_IDS[characterClass],
        }));
      },
      updateCharacter: (name, appearanceId, customization) => {
        if (!isAppearance(appearanceId)) {
          return;
        }

        const characterName = name.trim().slice(0, 16) || 'Ascendant';
        setState((current) => ({
          ...current,
          characterName,
          appearanceId,
          avatarCustomization: customization
            ? restoreAvatarCustomization(customization)
            : current.avatarCustomization,
        }));
      },
      toggleQuest: (questId) => {
        setState((current) => {
          const quest = getDailyQuests(current.characterClass).find(
            (item) => item.id === questId,
          );
          if (!quest) return current;

          const today = getQuestCycleKey();
          const completedQuestIds =
            current.questDay === today ? current.completedQuestIds : [];
          const completed = completedQuestIds.includes(questId);
          const progression = getQuestProgressionReward(
            quest,
            current.characterClass,
            getActiveStreak(current, today),
          );
          const questStreak = completed
            ? current.questStreak
            : getNextStreak(current, today);

          return {
            ...current,
            questDay: today,
            completedQuestIds: completed
              ? completedQuestIds.filter((id) => id !== questId)
              : [...completedQuestIds, questId],
            totalXp: Math.max(
              0,
              current.totalXp + (completed ? -progression.xp : progression.xp),
            ),
            statGains: {
              ...current.statGains,
              [quest.stat]: Math.max(
                0,
                current.statGains[quest.stat] +
                  (completed ? -progression.statGain : progression.statGain),
              ),
            },
            questStreak,
            lastQuestCompletionDay: completed
              ? current.lastQuestCompletionDay
              : today,
            questWeek: getQuestWeekKey(),
            weeklyQuestCount:
              Math.max(
                0,
                (current.questWeek === getQuestWeekKey()
                  ? current.weeklyQuestCount
                  : 0) + (completed ? -1 : 1),
              ),
            weeklyXp: Math.max(
              0,
              (current.questWeek === getQuestWeekKey()
                ? current.weeklyXp
                : 0) + (completed ? -progression.xp : progression.xp),
            ),
            activityHistory: completed
              ? current.activityHistory
              : addActivity(
                  current.activityHistory,
                  `${quest.title} complete`,
                  progression.xp,
                ),
          };
        });
      },
      completeQuest: (questId) => {
        setState((current) => {
          const quest = getDailyQuests(current.characterClass).find(
            (item) => item.id === questId,
          );
          if (!quest) return current;

          const today = getQuestCycleKey();
          const completedQuestIds =
            current.questDay === today ? current.completedQuestIds : [];
          if (completedQuestIds.includes(questId)) return current;
          const progression = getQuestProgressionReward(
            quest,
            current.characterClass,
            getActiveStreak(current, today),
          );

          return {
            ...current,
            questDay: today,
            completedQuestIds: [...completedQuestIds, questId],
            totalXp: current.totalXp + progression.xp,
            statGains: {
              ...current.statGains,
              [quest.stat]:
                current.statGains[quest.stat] + progression.statGain,
            },
            questStreak: getNextStreak(current, today),
            lastQuestCompletionDay: today,
            questWeek: getQuestWeekKey(),
            weeklyQuestCount:
              (current.questWeek === getQuestWeekKey()
                ? current.weeklyQuestCount
                : 0) + 1,
            weeklyXp:
              (current.questWeek === getQuestWeekKey()
                ? current.weeklyXp
                : 0) + progression.xp,
            activityHistory: addActivity(
              current.activityHistory,
              `${quest.title} verified`,
              progression.xp,
            ),
          };
        });
      },
      unlockSkill: (skillId) => {
        setState((current) => {
          const currentSkills = SKILL_TREES[current.characterClass];
          const skill = currentSkills.find((item) => item.id === skillId);
          if (!skill) return current;

          const currentLevel = getLevelProgress(current.totalXp).level;
          const currentUnlockedIds = getEffectiveSkillIds(
            current.characterClass,
            current.unlockedSkillIds,
          );
          const points = getSkillPoints(
            currentLevel,
            currentSkills,
            currentUnlockedIds,
          );

          if (
            !canUnlockSkill(
              skill,
              currentLevel,
              points.available,
              currentUnlockedIds,
            )
          ) {
            return current;
          }

          return {
            ...current,
            unlockedSkillIds: [...current.unlockedSkillIds, skill.id],
          };
        });
      },
      resetSkills: () => {
        setState((current) => ({
          ...current,
          unlockedSkillIds: [],
        }));
      },
      isRaidRewardAvailable: (dungeonId) =>
        canClaimRaidReward(state.raidRewardDays, dungeonId, questCycleKey),
      claimRaidVictory: (
        dungeonId,
        bossName = 'Raid boss',
        rewardXp = 500,
      ) => {
        if (!DUNGEONS.some((dungeon) => dungeon.id === dungeonId)) return false;
        const today = getQuestCycleKey();
        const rewardAvailable = canClaimRaidReward(
          state.raidRewardDays,
          dungeonId,
          today,
        );

        setState((current) => {
          const canClaimReward = canClaimRaidReward(
            current.raidRewardDays,
            dungeonId,
            today,
          );
          const focus = CHARACTER_CLASSES[current.characterClass].focus;
          const xpEarned = canClaimReward
            ? rewardXp
            : Math.max(5, Math.round(rewardXp * 0.25 / 5) * 5);

          return {
            ...current,
            raidWins: current.raidWins + 1,
            raidRewardDays: canClaimReward
              ? recordRaidReward(current.raidRewardDays, dungeonId, today)
              : current.raidRewardDays,
            totalXp: current.totalXp + xpEarned,
            questWeek: getQuestWeekKey(),
            weeklyXp:
              (current.questWeek === getQuestWeekKey()
                ? current.weeklyXp
                : 0) + xpEarned,
            statGains: canClaimReward
              ? {
                  ...current.statGains,
                  [focus]: current.statGains[focus] + 2,
                }
              : current.statGains,
            activityHistory: addActivity(
              current.activityHistory,
              canClaimReward ? `${bossName} defeated` : `${bossName} practice clear`,
              xpEarned,
            ),
          };
        });

        return rewardAvailable;
      },
      markDungeonComplete: (dungeonId) => {
        if (!DUNGEONS.some((dungeon) => dungeon.id === dungeonId)) return;
        setState((current) => ({
          ...current,
          completedDungeonIds: current.completedDungeonIds.includes(dungeonId)
            ? current.completedDungeonIds
            : [...current.completedDungeonIds, dungeonId],
          dungeonClearCounts: {
            ...current.dungeonClearCounts,
            [dungeonId]: (current.dungeonClearCounts[dungeonId] ?? 0) + 1,
          },
        }));
      },
      addFriend: (friendId) => {
        const valid = FRIEND_PROFILE_IDS.includes(friendId);
        const canAdd = valid && !state.friendIds.includes(friendId);
        if (canAdd) {
          setState((current) => ({
            ...current,
            friendIds: current.friendIds.includes(friendId)
              ? current.friendIds
              : [...current.friendIds, friendId],
          }));
        }
        return canAdd;
      },
      removeFriend: (friendId) => {
        setState((current) => ({
          ...current,
          friendIds: current.friendIds.filter((id) => id !== friendId),
          partyMemberIds: current.partyMemberIds.filter(
            (id) => id !== friendId,
          ),
        }));
      },
      togglePartyMember: (friendId) => {
        const isFriend = state.friendIds.includes(friendId);
        const isInParty = state.partyMemberIds.includes(friendId);
        const canToggle =
          Boolean(state.partyName) &&
          isFriend &&
          (isInParty || state.partyMemberIds.length < 3);
        if (canToggle) {
          setState((current) => ({
            ...current,
            partyMemberIds: current.partyMemberIds.includes(friendId)
              ? current.partyMemberIds.filter((id) => id !== friendId)
              : current.partyMemberIds.length < 3
                ? [...current.partyMemberIds, friendId]
                : current.partyMemberIds,
          }));
        }
        return canToggle;
      },
      equipGearSet: (gearSetId) => {
        const gear = getGearSet(gearSetId);
        const level = getLevelProgress(state.totalXp).level;
        const canEquip =
          gear?.characterClass === state.characterClass &&
          level >= gear.unlockLevel;
        if (canEquip) {
          setState((current) => ({
            ...current,
            equippedGearSetId: gearSetId,
          }));
        }
        return canEquip;
      },
      createParty: (name) => {
        const partyName = name.trim().slice(0, 24);
        if (!partyName) return false;
        setState((current) => ({
          ...current,
          partyName,
          partyChatMessages: current.partyName
            ? current.partyChatMessages
            : [
                {
                  id: `${Date.now()}-party-created`,
                  senderId: 'system',
                  text: `${partyName} was created. Invite friends to begin.`,
                  timestamp: Date.now(),
                },
              ],
        }));
        return true;
      },
      disbandParty: () => {
        setState((current) => ({
          ...current,
          partyName: null,
          partyMemberIds: [],
          partyChatMessages: [],
        }));
      },
      sendPartyMessage: (text, senderId = 'you') => {
        const messageText = text.trim().slice(0, 280);
        if (!messageText || !state.partyName) return;
        const timestamp = Date.now();
        setState((current) =>
          current.partyName
            ? {
                ...current,
                partyChatMessages: [
                  ...current.partyChatMessages,
                  {
                    id: `${timestamp}-${senderId}-${messageText}`,
                    senderId,
                    text: messageText,
                    timestamp,
                  },
                ].slice(-100),
              }
            : current,
        );
      },
      resetProgress: () => {
        setState(createInitialState());
      },
    };
  }, [hydrated, questCycleKey, state, storageError]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used inside GameProvider');
  }

  return context;
}
