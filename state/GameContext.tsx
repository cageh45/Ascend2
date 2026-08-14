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
} from '../game/appearanceData';
import { FRIEND_PROFILE_IDS } from '../data/socialData';
import {
  DEFAULT_GEAR_SET_IDS,
  GEAR_SET_IDS,
  GearSetId,
  getGearSet,
} from '../game/gearData';
import { DUNGEONS, DungeonId } from '../game/dungeonData';

const STORAGE_KEY = '@ascend/game-state-v1';

type GameState = {
  version: 1;
  onboardingComplete: boolean;
  characterClass: CharacterClassName;
  characterName: string;
  appearanceId: AppearanceId;
  totalXp: number;
  completedQuestIds: QuestId[];
  questDay: string;
  statGains: Record<StatName, number>;
  raidWins: number;
  completedDungeonIds: DungeonId[];
  lastRaidRewardDay: string | null;
  unlockedSkillIds: string[];
  questStreak: number;
  lastQuestCompletionDay: string | null;
  activityHistory: ActivityEntry[];
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
  totalXp: number;
  completedQuestIds: QuestId[];
  stats: Record<StatName, number>;
  raidWins: number;
  completedDungeonIds: DungeonId[];
  raidRewardAvailable: boolean;
  unlockedSkillIds: string[];
  skillPointsAvailable: number;
  questStreak: number;
  recentActivity: ActivityEntry[];
  friendIds: string[];
  partyMemberIds: string[];
  equippedGearSetId: GearSetId;
  partyName: string | null;
  partyChatMessages: PartyChatMessage[];
  completeOnboarding: (characterClass: CharacterClassName) => void;
  updateCharacter: (name: string, appearanceId: AppearanceId) => void;
  toggleQuest: (questId: QuestId) => void;
  completeQuest: (questId: QuestId) => void;
  unlockSkill: (skillId: string) => void;
  resetSkills: () => void;
  claimRaidVictory: (bossName?: string, rewardXp?: number) => boolean;
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

function getDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPreviousDayKey() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getDayKey(yesterday);
}

function getNextStreak(current: GameState, today: string) {
  if (current.lastQuestCompletionDay === today) return current.questStreak;
  return current.lastQuestCompletionDay === getPreviousDayKey()
    ? current.questStreak + 1
    : 1;
}

function getActiveStreak(current: GameState, today = getDayKey()) {
  return current.lastQuestCompletionDay === today ||
    current.lastQuestCompletionDay === getPreviousDayKey()
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
    totalXp: 0,
    completedQuestIds: [],
    questDay: getDayKey(),
    statGains: { ...zeroStatGains },
    raidWins: 0,
    completedDungeonIds: [],
    lastRaidRewardDay: null,
    unlockedSkillIds: [],
    questStreak: 0,
    lastQuestCompletionDay: null,
    activityHistory: [],
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

function restoreState(value: string | null): GameState {
  if (!value) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(value) as Partial<GameState>;
    const initial = createInitialState();
    const questIds = new Set<QuestId>(QUESTS.map((quest) => quest.id));
    const isCurrentDay = parsed.questDay === getDayKey();
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
      questDay: getDayKey(),
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
      lastRaidRewardDay:
        typeof parsed.lastRaidRewardDay === 'string'
          ? parsed.lastRaidRewardDay
          : null,
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

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<GameState>(createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

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

  const value = useMemo<GameContextValue>(() => {
    const dailyQuestIds = new Set<QuestId>(
      getDailyQuests(state.characterClass).map((quest) => quest.id),
    );
    const currentQuestIds =
      state.questDay === getDayKey()
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
      totalXp: state.totalXp,
      completedQuestIds: currentQuestIds,
      stats,
      raidWins: state.raidWins,
      completedDungeonIds: state.completedDungeonIds,
      raidRewardAvailable: state.lastRaidRewardDay !== getDayKey(),
      unlockedSkillIds,
      skillPointsAvailable: skillPoints.available,
      questStreak: getActiveStreak(state),
      recentActivity: state.activityHistory,
      friendIds: state.friendIds,
      partyMemberIds: state.partyMemberIds,
      equippedGearSetId: state.equippedGearSetId,
      partyName: state.partyName,
      partyChatMessages: state.partyChatMessages,
      completeOnboarding: (characterClass) => {
        if (!CHARACTER_CLASSES[characterClass]) {
          return;
        }

        setState((current) => ({
          ...current,
          onboardingComplete: true,
          characterClass,
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
      updateCharacter: (name, appearanceId) => {
        if (!isAppearance(appearanceId)) {
          return;
        }

        const characterName = name.trim().slice(0, 16) || 'Ascendant';
        setState((current) => ({
          ...current,
          characterName,
          appearanceId,
        }));
      },
      toggleQuest: (questId) => {
        setState((current) => {
          const quest = getDailyQuests(current.characterClass).find(
            (item) => item.id === questId,
          );
          if (!quest) return current;

          const today = getDayKey();
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

          const today = getDayKey();
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
      claimRaidVictory: (bossName = 'Raid boss', rewardXp = 500) => {
        const today = getDayKey();
        const rewardAvailable = state.lastRaidRewardDay !== today;

        setState((current) => {
          const canClaimReward = current.lastRaidRewardDay !== today;
          const focus = CHARACTER_CLASSES[current.characterClass].focus;

          return {
            ...current,
            raidWins: current.raidWins + 1,
            lastRaidRewardDay: canClaimReward
              ? today
              : current.lastRaidRewardDay,
            totalXp: current.totalXp + (canClaimReward ? rewardXp : 0),
            statGains: canClaimReward
              ? {
                  ...current.statGains,
                  [focus]: current.statGains[focus] + 2,
                }
              : current.statGains,
            activityHistory: canClaimReward
              ? addActivity(
                  current.activityHistory,
                  `${bossName} defeated`,
                  rewardXp,
                )
              : current.activityHistory,
          };
        });

        return rewardAvailable;
      },
      markDungeonComplete: (dungeonId) => {
        if (!DUNGEONS.some((dungeon) => dungeon.id === dungeonId)) return;
        setState((current) =>
          current.completedDungeonIds.includes(dungeonId)
            ? current
            : {
                ...current,
                completedDungeonIds: [
                  ...current.completedDungeonIds,
                  dungeonId,
                ],
              },
        );
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
  }, [hydrated, state, storageError]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used inside GameProvider');
  }

  return context;
}
