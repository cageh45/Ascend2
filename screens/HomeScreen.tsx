import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import QuestActivityModal from '../components/QuestActivityModal';
import QuestJournalModal from '../components/QuestJournalModal';
import ProgressionRewardModal, {
  ProgressionReward,
} from '../components/ProgressionRewardModal';
import {
  APPEARANCE_IDS,
  APPEARANCES,
  AppearanceId,
  getAvatarEvolution,
} from '../game/appearanceData';
import { getEquippedGearSet } from '../game/gearData';
import {
  CHARACTER_CLASSES,
  getAttributeRank,
  getBaseStats,
  getDailyQuestSet,
  getLevelProgress,
  getQuestProgressionReward,
  QuestDifficulty,
  QuestDefinition,
  StatName,
} from '../game/gameData';
import { getQuestActivity, QuestActivity } from '../game/questActivityData';
import {
  getCombatRating,
  getFeaturedQuestIds,
  getNextMilestone,
} from '../game/progressionData';
import { MainTabParamList } from '../navigation/types';
import { useGame } from '../state/GameContext';
import { HOME_MUSIC } from '../game/musicData';
import { useMusic } from '../state/MusicContext';
import GameIcon from '../components/GameIcon';
import { getWeeklyArc, WEEKLY_QUEST_TARGET } from '../game/weeklyData';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Props = BottomTabScreenProps<MainTabParamList, 'HomeTab'>;

const STAT_DETAILS: Record<
  StatName,
  { icon: string; name: string; effect: string }
> = {
  strength: { icon: 'stat-strength', name: 'Strength', effect: 'Attack force' },
  intelligence: { icon: 'stat-intelligence', name: 'Intelligence', effect: 'Starting energy' },
  mindfulness: { icon: 'stat-mindfulness', name: 'Mindfulness', effect: 'Healing power' },
  endurance: { icon: 'stat-endurance', name: 'Endurance', effect: 'Battle health' },
  vitality: { icon: 'stat-vitality', name: 'Vitality', effect: 'Maximum health' },
};

export default function HomeScreen({ navigation }: Props) {
  const {
    appearanceId,
    characterClass,
    characterName,
    completeQuest,
    completedQuestIds,
    equippedGearSetId,
    raidWins,
    questCycleKey,
    questStreak,
    recentActivity,
    skillPointsAvailable,
    stats,
    totalXp,
    unlockedSkillIds,
    weeklyQuestCount,
    weeklyXp,
    questWeekKey,
    updateCharacter,
  } = useGame();
  const { playTrack } = useMusic();
  const character = CHARACTER_CLASSES[characterClass];
  const appearance = APPEARANCES[appearanceId];
  const levelProgress = getLevelProgress(totalXp);
  const evolution = getAvatarEvolution(characterClass, levelProgress.level);
  const baseStats = getBaseStats(characterClass);
  const totalAttributePower = Object.values(stats).reduce(
    (sum, value) => sum + value,
    0,
  );
  const statOrder = (Object.keys(STAT_DETAILS) as StatName[]).sort((a, b) =>
    a === character.focus ? -1 : b === character.focus ? 1 : 0,
  );
  const equippedGear = getEquippedGearSet(characterClass, equippedGearSetId);
  const combatRating = getCombatRating(
    characterClass,
    levelProgress.level,
    stats,
    equippedGear,
    unlockedSkillIds.length,
  );
  const nextMilestone = getNextMilestone(characterClass, levelProgress.level);
  const weeklyArc = getWeeklyArc(characterClass, questWeekKey);
  const weeklyProgress = Math.min(1, weeklyQuestCount / WEEKLY_QUEST_TARGET);
  const reduceMotion = useReducedMotion();
  const dailyQuestSet = useMemo(
    () => getDailyQuestSet(characterClass),
    [characterClass, questCycleKey],
  );
  const { classQuests, sharedQuests, quests: dailyQuests } = dailyQuestSet;
  const featuredQuestIds = useMemo(
    () => new Set(getFeaturedQuestIds(classQuests, sharedQuests)),
    [classQuests, sharedQuests],
  );
  const completedClassQuests = classQuests.filter((quest) =>
    completedQuestIds.includes(quest.id),
  ).length;
  const completedSharedQuests = sharedQuests.filter((quest) =>
    completedQuestIds.includes(quest.id),
  ).length;
  const [customizing, setCustomizing] = useState(false);
  const [draftName, setDraftName] = useState(characterName);
  const [draftAppearance, setDraftAppearance] =
    useState<AppearanceId>(appearanceId);
  const heroFloat = useRef(new Animated.Value(0)).current;
  const auraPulse = useRef(new Animated.Value(0)).current;
  const orbitSpin = useRef(new Animated.Value(0)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackY = useRef(new Animated.Value(-12)).current;
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<QuestDefinition | null>(null);
  const [journalVisible, setJournalVisible] = useState(false);
  const [progressionReward, setProgressionReward] =
    useState<ProgressionReward | null>(null);

  useFocusEffect(
    useCallback(() => playTrack(HOME_MUSIC[characterClass]), [characterClass, playTrack]),
  );

  useEffect(() => {
    if (reduceMotion) {
      heroFloat.setValue(0);
      auraPulse.setValue(0.45);
      orbitSpin.setValue(0);
      return;
    }

    const floating = Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloat, {
          toValue: -8,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(heroFloat, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    const pulsing = Animated.loop(
      Animated.sequence([
        Animated.timing(auraPulse, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(auraPulse, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    const orbiting = Animated.loop(
      Animated.timing(orbitSpin, {
        toValue: 1,
        duration: 12000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    floating.start();
    pulsing.start();
    orbiting.start();

    return () => {
      floating.stop();
      pulsing.stop();
      orbiting.stop();
    };
  }, [auraPulse, heroFloat, orbitSpin, reduceMotion]);

  const auraScale = auraPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1.08],
  });
  const auraOpacity = auraPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.12 * evolution.auraStrength, 0.24 * evolution.auraStrength],
  });
  const orbitRotation = orbitSpin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  function openCustomizer() {
    setDraftName(characterName);
    setDraftAppearance(appearanceId);
    setCustomizing(true);
  }

  function saveCustomization() {
    updateCharacter(draftName, draftAppearance);
    setCustomizing(false);
  }

  function handleQuestPress(quest: QuestDefinition) {
    if (completedQuestIds.includes(quest.id)) return;

    if (getQuestActivity(quest)) setActiveQuest(quest);
  }

  function handleGuidedQuestComplete(quest: QuestDefinition) {
    if (completedQuestIds.includes(quest.id)) return;
    const progression = getQuestProgressionReward(
      quest,
      characterClass,
      questStreak,
    );
    const nextTotalXp = totalXp + progression.xp;
    const nextStats = {
      ...stats,
      [quest.stat]: stats[quest.stat] + progression.statGain,
    };
    const nextLevel = getLevelProgress(nextTotalXp).level;
    const nextRating = getCombatRating(
      characterClass,
      nextLevel,
      nextStats,
      equippedGear,
      unlockedSkillIds.length,
    );
    completeQuest(quest.id);
    setProgressionReward({
      quest,
      xp: progression.xp,
      statGain: progression.statGain,
      previousLevel: levelProgress.level,
      nextLevel,
      previousRating: combatRating.total,
      nextRating: nextRating.total,
    });

    setFeedback(`QUEST COMPLETE  ·  +${progression.xp} XP  ·  ${quest.stat.toUpperCase()} +${progression.statGain}`);
    feedbackOpacity.setValue(0);
    feedbackY.setValue(-12);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(feedbackOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(feedbackY, {
          toValue: 0,
          speed: 18,
          bounciness: 5,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1300),
      Animated.timing(feedbackOpacity, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setFeedback(null));
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greeting}>WELCOME BACK</Text>
            <Text style={styles.pageTitle}>Your Ascendant</Text>
          </View>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>ON DEVICE</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={[styles.levelMedallion, { borderColor: appearance.accent }]}>
            <Text style={styles.levelCaption}>LV</Text>
            <Text style={styles.levelNumber}>{levelProgress.level}</Text>
          </View>
          <View style={styles.progressDetails}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressTitle}>ASCENSION PROGRESS</Text>
              <Text style={[styles.xpText, { color: appearance.accent }]}>
                {levelProgress.currentXp} / {levelProgress.xpForNextLevel} XP
              </Text>
            </View>
            <View style={styles.xpBar}>
              <View
                style={[
                  styles.xpProgress,
                  {
                    backgroundColor: appearance.accent,
                    width: levelProgress.progressPercent,
                  },
                ]}
              />
            </View>
            <Text style={styles.nextLevelText}>
              {levelProgress.xpForNextLevel - levelProgress.currentXp} XP TO LEVEL {levelProgress.level + 1}
            </Text>
            <Text style={styles.progressBonusText}>
              CLASS ALIGNMENT +15% · STREAK BONUS +{Math.min(15, Math.max(0, questStreak - 1) * 3)}%
            </Text>
          </View>
        </View>

        <View style={[styles.heroStage, { borderColor: `${appearance.accent}66` }]}>
          <View style={[styles.stageWash, { backgroundColor: appearance.accent }]} />
          <Text style={styles.starLeft}>✦</Text>
          <Text style={styles.starRight}>✦</Text>
          <Animated.View
            style={[
              styles.aura,
              {
                backgroundColor: appearance.accent,
                opacity: auraOpacity,
                transform: [{ scale: auraScale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.orbit,
              {
                borderColor: `${appearance.accent}75`,
                transform: [{ rotate: orbitRotation }],
              },
            ]}
          >
            <View style={[styles.orbitNode, { backgroundColor: appearance.accent }]} />
          </Animated.View>
          <View style={[styles.platformOuter, { borderColor: `${appearance.accent}70` }]} />
          <View style={[styles.platformInner, { backgroundColor: `${appearance.accent}2B` }]} />

          <Animated.Image
            source={equippedGear.source}
            style={[
              styles.heroImage,
              {
                transform: [
                  { translateY: heroFloat },
                  { scale: evolution.scale },
                  { scaleX: evolution.widthScale },
                ],
              },
            ]}
            resizeMode="contain"
            accessibilityLabel={`${characterName}, ${characterClass} with ${appearance.name} aura`}
          />

          <View style={[styles.classPill, { borderColor: `${character.color}80` }]}> 
            <GameIcon token={character.icon} size={26} />
            <Text style={styles.classPillText}>{characterClass.toUpperCase()}</Text>
          </View>

          <Pressable
            style={styles.customizeButton}
            onPress={openCustomizer}
            accessibilityRole="button"
            accessibilityLabel="Customize character"
          >
            <GameIcon token="progress-xp" size={20} />
            <Text style={styles.customizeButtonText}>EDIT</Text>
          </Pressable>

          <View style={[styles.evolutionBadge, { borderColor: `${character.color}90` }]}>
            <Text style={[styles.evolutionStage, { color: character.color }]}>FORM {evolution.stage + 1}</Text>
            <Text style={styles.evolutionName}>{evolution.name.toUpperCase()}</Text>
            <Text style={styles.evolutionTitle}>
              {evolution.nextLevel
                ? `${evolution.title} · NEXT LV ${evolution.nextLevel}`
                : `${evolution.title} · FINAL FORM`}
            </Text>
          </View>

          <View style={styles.heroIdentity}>
            <Text style={styles.characterName}>{characterName}</Text>
            <Text style={styles.characterTitle}>
              {equippedGear.name.toUpperCase()} · {appearance.name.toUpperCase()} AURA
            </Text>
          </View>
        </View>

        <View style={styles.snapshotRow}>
          <Snapshot value={`${completedQuestIds.length}/${dailyQuests.length}`} label="TODAY" accent="#54D68A" />
          <View style={styles.snapshotDivider} />
          <Snapshot value={String(raidWins)} label="RAID WINS" accent="#FF655F" />
          <View style={styles.snapshotDivider} />
          <Snapshot value={`${questStreak}d`} label="STREAK" accent="#FFB45E" />
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>BUILD</Text>
            <Text style={styles.sectionTitle}>Core attributes</Text>
          </View>
          <Text style={styles.focusLabel}>
            FOCUS: {character.focus.toUpperCase()}
          </Text>
        </View>

        <View style={[styles.attributeSummary, { borderColor: `${character.color}60` }]}>
          <View>
            <Text style={styles.attributeSummaryEyebrow}>TOTAL ATTRIBUTE POWER</Text>
            <Text style={styles.attributeSummaryValue}>{totalAttributePower}</Text>
          </View>
          <View style={styles.attributeSummaryDivider} />
          <View style={styles.attributeSummaryCopy}>
            <Text style={[styles.attributeSummaryTitle, { color: character.color }]}>REAL EFFORT BECOMES POWER</Text>
            <Text style={styles.attributeSummaryText}>
              Quick quests grant 1 point, Core quests 2, and Challenges 3.
            </Text>
          </View>
        </View>

        <View style={styles.powerCard}>
          <View style={styles.powerIdentity}>
            <GameIcon token="combat-crown" size={46} />
            <View>
              <Text style={styles.powerEyebrow}>COMBAT RATING</Text>
              <Text style={[styles.powerValue, { color: character.color }]}>
                {combatRating.total.toLocaleString()}
              </Text>
            </View>
          </View>
          <View style={styles.powerMilestone}>
            <Text style={styles.powerMilestoneLabel}>{nextMilestone.title}</Text>
            <Text style={styles.powerMilestoneTitle}>LEVEL {nextMilestone.level}</Text>
            <Text style={styles.powerMilestoneText}>{nextMilestone.detail}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {statOrder.map((stat, index) => (
            <Stat
              key={stat}
              icon={STAT_DETAILS[stat].icon}
              name={STAT_DETAILS[stat].name}
              effect={STAT_DETAILS[stat].effect}
              value={stats[stat]}
              gained={stats[stat] - baseStats[stat]}
              focused={stat === character.focus}
              accent={stat === character.focus ? character.color : stat === 'vitality' ? '#54D68A' : appearance.accent}
              fullWidth={index === 0}
            />
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>DAILY PATH</Text>
            <Text style={styles.sectionTitle}>Quests</Text>
          </View>
          <Text style={[styles.focusLabel, { color: appearance.accent }]}>
            {completedQuestIds.length} / {dailyQuests.length} COMPLETE
          </Text>
        </View>

        <View style={[styles.dailyFocusCard, { borderColor: `${character.color}66` }]}>
          <View style={styles.dailyFocusHeading}>
            <GameIcon token="combat-target" size={34} />
            <View style={styles.dailyFocusCopy}>
              <Text style={[styles.dailyFocusTitle, { color: character.color }]}>TODAY’S MAIN PATH</Text>
              <Text style={styles.dailyFocusText}>
                Complete the three marked quests for a balanced session. The other{' '}
                {Math.max(0, dailyQuests.length - featuredQuestIds.size)} are optional bonus objectives.
              </Text>
            </View>
          </View>
          <View style={styles.dailyFocusProgress}>
            {[...featuredQuestIds].map((questId) => (
              <View
                key={questId}
                style={[
                  styles.dailyFocusNode,
                  completedQuestIds.includes(questId) && {
                    backgroundColor: character.color,
                    borderColor: character.color,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.weeklyArcCard}>
          <View style={styles.weeklyArcTop}>
            <View style={styles.weeklyArcIcon}>
              <GameIcon token={character.icon} size={34} />
            </View>
            <View style={styles.weeklyArcCopy}>
              <Text style={styles.weeklyArcEyebrow}>WEEKLY STORY ARC</Text>
              <Text style={styles.weeklyArcTitle}>{weeklyArc.title}</Text>
              <Text style={styles.weeklyArcObjective}>{weeklyArc.objective}</Text>
            </View>
            <Text style={[styles.weeklyArcCount, { color: character.color }]}>
              {Math.min(weeklyQuestCount, WEEKLY_QUEST_TARGET)}/{WEEKLY_QUEST_TARGET}
            </Text>
          </View>
          <View style={styles.weeklyArcTrack}>
            <View
              style={[
                styles.weeklyArcFill,
                {
                  width: `${weeklyProgress * 100}%`,
                  backgroundColor: character.color,
                },
              ]}
            />
          </View>
          <View style={styles.weeklyArcMilestones}>
            <Text style={styles.weeklyArcMeta}>5 · MOMENTUM</Text>
            <Text style={styles.weeklyArcMeta}>12 · DISCIPLINE</Text>
            <Text style={styles.weeklyArcMeta}>20 · MASTERY</Text>
          </View>
          <Text style={styles.weeklyArcXp}>{weeklyXp.toLocaleString()} XP EARNED THIS WEEK</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.questJournalBase,
            styles.questJournalCard,
            pressed && styles.questJournalPressed,
          ]}
          onPress={() => setJournalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Open saved quest journal"
        >
          <View style={styles.questJournalHeader}>
            <View style={styles.questJournalIdentity}>
              <GameIcon token="quest-notes" size={42} />
              <View>
                <Text style={styles.questJournalEyebrow}>PRIVATE QUEST MODE</Text>
                <Text style={styles.questJournalTitle}>Ascend Quest Journal</Text>
              </View>
            </View>
            <Text style={styles.localOnlyBadge}>OPEN LOG</Text>
          </View>
          <Text style={styles.questJournalMessage}>
            Every daily objective is completed inside Ascend. Open a quest to use its timer,
            counter, checklist, or private journal, then claim the reward and return here.
          </Text>
          <View style={styles.questToolRow}>
            <Text style={styles.questTool}>TIMERS</Text>
            <Text style={styles.questTool}>COUNTERS</Text>
            <Text style={styles.questTool}>CHECK-INS</Text>
          </View>
        </Pressable>

        <View style={styles.questGroupHeader}>
          <View>
            <View style={styles.questGroupTitleRow}>
              <GameIcon token={character.icon} size={28} />
              <Text style={[styles.questGroupTitle, { color: character.color }]}> 
                {characterClass.toUpperCase()} ORDERS
              </Text>
            </View>
            <Text style={styles.questGroupSubtitle}>
              Set {dailyQuestSet.index + 1} of 10 · refreshes daily at noon
            </Text>
          </View>
          <Text style={styles.questGroupCount}>
            {completedClassQuests}/{classQuests.length}
          </Text>
        </View>

        {classQuests.map((quest) => {
          const progression = getQuestProgressionReward(
            quest,
            characterClass,
            questStreak,
          );
          return (
            <Quest
              key={quest.id}
              icon={quest.icon}
              title={quest.title}
              description={quest.description}
              difficulty={quest.difficulty}
              stat={quest.stat}
              statGain={progression.statGain}
              reward={`+${progression.xp} XP`}
              activity={getQuestActivity(quest)}
              featured={featuredQuestIds.has(quest.id)}
              completed={completedQuestIds.includes(quest.id)}
              onToggle={() => handleQuestPress(quest)}
              accent={character.color}
            />
          );
        })}

        <View style={[styles.questGroupHeader, styles.foundationHeader]}>
          <View>
            <View style={styles.questGroupTitleRow}>
              <GameIcon token="progress-xp" size={28} />
              <Text style={[styles.questGroupTitle, { color: appearance.accent }]}> 
                BALANCED FOUNDATIONS
              </Text>
            </View>
            <Text style={styles.questGroupSubtitle}>
              Daily habits shared by every class
            </Text>
          </View>
          <Text style={styles.questGroupCount}>
            {completedSharedQuests}/{sharedQuests.length}
          </Text>
        </View>

        {sharedQuests.map((quest) => {
          const progression = getQuestProgressionReward(
            quest,
            characterClass,
            questStreak,
          );
          return (
            <Quest
              key={quest.id}
              icon={quest.icon}
              title={quest.title}
              description={quest.description}
              difficulty={quest.difficulty}
              stat={quest.stat}
              statGain={progression.statGain}
              reward={`+${progression.xp} XP`}
              activity={getQuestActivity(quest)}
              featured={featuredQuestIds.has(quest.id)}
              completed={completedQuestIds.includes(quest.id)}
              onToggle={() => handleQuestPress(quest)}
              accent={appearance.accent}
            />
          );
        })}

        {recentActivity.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>ACTIVITY LOG</Text>
                <Text style={styles.sectionTitle}>Recent XP</Text>
              </View>
              <Text style={styles.focusLabel}>{skillPointsAvailable} SKILL POINTS</Text>
            </View>
            <View style={styles.activityCard}>
              {recentActivity.slice(0, 3).map((entry, index) => (
                <View
                  key={entry.id}
                  style={[
                    styles.activityRow,
                    index === Math.min(2, recentActivity.length - 1) &&
                      styles.activityRowLast,
                  ]}
                >
                  <View style={styles.activityGlyph}><GameIcon token="progress-xp" size={24} /></View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityMessage}>{entry.message}</Text>
                    <Text style={styles.activityTime}>{formatActivityTime(entry.timestamp)}</Text>
                  </View>
                  <Text style={styles.activityXp}>+{entry.xp} XP</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Pressable
          style={[styles.skillButton, { backgroundColor: appearance.accent }]}
          onPress={() => navigation.navigate('SkillsTab')}
          accessibilityRole="button"
          accessibilityLabel="Open skill tree"
        >
          <View>
            <Text style={styles.skillButtonTitle}>CONTINUE YOUR BUILD</Text>
            <Text style={styles.skillButtonSubtitle}>Open the {characterClass} skill tree</Text>
          </View>
          <Text style={styles.skillButtonArrow}>→</Text>
        </Pressable>
      </ScrollView>

      {feedback && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.feedbackToast,
            {
              opacity: feedbackOpacity,
              transform: [{ translateY: feedbackY }],
            },
          ]}
        >
          <Text style={styles.feedbackToastText}>{feedback}</Text>
        </Animated.View>
      )}

      <QuestActivityModal
        visible={Boolean(activeQuest)}
        quest={activeQuest}
        accent={
          activeQuest && classQuests.some((quest) => quest.id === activeQuest.id)
            ? character.color
            : appearance.accent
        }
        onClose={() => setActiveQuest(null)}
        onComplete={handleGuidedQuestComplete}
        rewardXp={
          activeQuest
            ? getQuestProgressionReward(activeQuest, characterClass, questStreak).xp
            : 0
        }
        statGain={
          activeQuest
            ? getQuestProgressionReward(activeQuest, characterClass, questStreak).statGain
            : 1
        }
      />

      <QuestJournalModal
        visible={journalVisible}
        accent={appearance.accent}
        onClose={() => setJournalVisible(false)}
      />

      <ProgressionRewardModal
        reward={progressionReward}
        accent={character.color}
        characterClass={characterClass}
        onClose={() => setProgressionReward(null)}
      />

      <Modal
        visible={customizing}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomizing(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setCustomizing(false)}
            accessibilityLabel="Close character customization"
          />
          <View style={styles.customizerCard}>
            <View style={styles.customizerHandle} />
            <View style={styles.customizerHeader}>
              <View>
                <Text style={styles.customizerEyebrow}>{characterClass.toUpperCase()} LOADOUT</Text>
                <Text style={styles.customizerTitle}>Customize hero</Text>
              </View>
              <View style={styles.customizerPreview}>
                <View style={[styles.customizerGlow, { backgroundColor: APPEARANCES[draftAppearance].accent }]} />
                <Animated.Image
                  source={equippedGear.source}
                  style={[
                    styles.customizerImage,
                    {
                      transform: [
                        { scale: evolution.scale },
                        { scaleX: evolution.widthScale },
                      ],
                    },
                  ]}
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>DISPLAY NAME</Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              maxLength={16}
              placeholder="Ascendant"
              placeholderTextColor="#5F667A"
              selectionColor={appearance.accent}
              style={styles.nameInput}
              returnKeyType="done"
            />

            <Text style={styles.fieldLabel}>AURA THEME</Text>
            <View style={styles.appearanceRow}>
              {APPEARANCE_IDS.map((id) => {
                const option = APPEARANCES[id];
                const selected = draftAppearance === id;

                return (
                  <Pressable
                    key={id}
                    style={[
                      styles.appearanceOption,
                      selected && {
                        borderColor: option.accent,
                        backgroundColor: `${option.accent}18`,
                      },
                    ]}
                    onPress={() => setDraftAppearance(id)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${option.name} aura`}
                  >
                    <View style={[styles.auraSwatch, { borderColor: option.accent }]}>
                      <View style={[styles.auraSwatchCore, { backgroundColor: option.accent }]} />
                    </View>
                    <Text style={styles.appearanceName}>{option.name}</Text>
                    <Text style={styles.appearanceDescription}>{option.description}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.saveButton, { backgroundColor: APPEARANCES[draftAppearance].accent }]}
              onPress={saveCustomization}
              accessibilityRole="button"
            >
              <Text style={styles.saveButtonText}>SAVE CHARACTER</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Snapshot({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <View style={styles.snapshot}>
      <Text style={[styles.snapshotValue, { color: accent }]}>{value}</Text>
      <Text style={styles.snapshotLabel}>{label}</Text>
    </View>
  );
}

function formatActivityTime(timestamp: number) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return 'JUST NOW';
  if (elapsedMinutes < 60) return `${elapsedMinutes} MIN AGO`;
  return new Date(timestamp).toLocaleDateString();
}

function Stat({
  icon,
  name,
  effect,
  value,
  gained,
  focused,
  accent,
  fullWidth = false,
}: {
  icon: string;
  name: string;
  effect: string;
  value: number;
  gained: number;
  focused: boolean;
  accent: string;
  fullWidth?: boolean;
}) {
  const rank = getAttributeRank(value);
  const rankProgress = Math.min(
    100,
    ((value - rank.floor) / Math.max(1, rank.ceiling - rank.floor)) * 100,
  );
  return (
    <View
      style={[
        styles.stat,
        fullWidth && styles.statFullWidth,
        focused && { borderColor: `${accent}99` },
      ]}
    >
      <View style={styles.statTopRow}>
        <View style={[styles.statIconShell, { backgroundColor: `${accent}16` }]}>
          <GameIcon token={icon} size={34} />
        </View>
        <View style={styles.statTags}>
          {gained > 0 && <Text style={styles.statGained}>+{gained} EARNED</Text>}
          {focused && <Text style={[styles.primaryTag, { color: accent }]}>PRIMARY</Text>}
        </View>
      </View>
      <View style={styles.statValueRow}>
        <Text style={styles.statValue}>{value}</Text>
        <View style={styles.statIdentity}>
          <Text style={styles.statName}>{name}</Text>
          <Text style={[styles.statRank, { color: accent }]}>{rank.name.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.statEffect}>{effect}</Text>
      <View style={styles.statProgressTrack}>
        <View
          style={[
            styles.statProgressFill,
            { width: `${rankProgress}%`, backgroundColor: accent },
          ]}
        />
      </View>
    </View>
  );
}

function Quest({
  icon,
  title,
  description,
  difficulty,
  stat,
  statGain,
  activity,
  featured,
  reward,
  completed,
  onToggle,
  accent,
}: {
  icon: string;
  title: string;
  description: string;
  difficulty: QuestDifficulty;
  stat: StatName;
  statGain: number;
  activity?: QuestActivity;
  featured: boolean;
  reward: string;
  completed: boolean;
  onToggle: () => void;
  accent: string;
}) {
  const difficultyColor = {
    Quick: '#54D68A',
    Core: '#65C7FF',
    Challenge: '#FFB45E',
  }[difficulty];
  return (
    <Pressable
      style={[
        styles.quest,
        completed && {
          borderColor: `${accent}80`,
          backgroundColor: `${accent}10`,
        },
      ]}
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      accessibilityLabel={`${title}, ${reward}`}
    >
      <View style={styles.questIconShell}>
        <GameIcon token={icon} size={39} />
      </View>
      <View style={styles.questInfo}>
        <View style={styles.questTitleRow}>
          <Text
            style={[styles.questTitle, completed && styles.questTitleComplete]}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text style={[styles.difficulty, { color: difficultyColor }]}>
            {difficulty.toUpperCase()}
          </Text>
        </View>
        {featured && !completed && (
          <Text style={[styles.featuredQuest, { color: accent }]}>MAIN PATH</Text>
        )}
        <Text style={styles.questDescription} numberOfLines={2}>
          {description}
        </Text>
        <View style={styles.rewardRow}>
          <View>
            <Text style={[styles.reward, { color: accent }]}>{reward}</Text>
            {!completed && (
              <Text style={styles.questActionLabel}>
                {getQuestActionLabel(activity)}
              </Text>
            )}
          </View>
          <Text style={styles.statReward}>+{statGain} {stat.toUpperCase()}</Text>
        </View>
      </View>
      <View style={[styles.check, completed && { backgroundColor: accent, borderColor: accent }]}>
        <Text style={[styles.checkText, completed && styles.completedCheckText]}>✓</Text>
      </View>
    </Pressable>
  );
}

function getQuestActionLabel(
  activity: QuestActivity | undefined,
) {
  if (activity?.type === 'timer') return 'OPEN TIMER';
  if (activity?.type === 'counter') return 'LOG PROGRESS';
  if (activity?.type === 'journal') return 'OPEN CHECK-IN';
  if (activity?.type === 'checklist') return 'OPEN CHECKLIST';
  return 'OPEN QUEST';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090B12',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 46,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  greeting: {
    color: '#8B7CFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 3,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#141823',
    borderWidth: 1,
    borderColor: '#282D3D',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#54D68A',
  },
  onlineText: {
    color: '#B8BECC',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121520',
    borderWidth: 1,
    borderColor: '#272B39',
    borderRadius: 18,
    padding: 13,
    gap: 13,
  },
  levelMedallion: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    backgroundColor: '#1A1D2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelCaption: {
    color: '#7E8597',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  levelNumber: {
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 23,
    fontWeight: '900',
  },
  progressDetails: {
    flex: 1,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  xpText: {
    fontSize: 9,
    fontWeight: '900',
  },
  xpBar: {
    height: 7,
    backgroundColor: '#292D3E',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 9,
  },
  xpProgress: {
    height: '100%',
    borderRadius: 4,
  },
  nextLevelText: {
    color: '#6F7689',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginTop: 6,
  },
  progressBonusText: {
    color: '#8B7CFF',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.45,
    marginTop: 4,
  },
  heroStage: {
    height: 448,
    backgroundColor: '#11141F',
    borderWidth: 1,
    borderRadius: 28,
    marginTop: 16,
    overflow: 'hidden',
  },
  stageWash: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    alignSelf: 'center',
    top: -180,
    opacity: 0.08,
  },
  starLeft: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 13,
    left: 42,
    top: 112,
    opacity: 0.6,
  },
  starRight: {
    position: 'absolute',
    color: '#FFFFFF',
    fontSize: 9,
    right: 42,
    top: 155,
    opacity: 0.4,
  },
  aura: {
    position: 'absolute',
    width: 245,
    height: 245,
    borderRadius: 123,
    alignSelf: 'center',
    top: 75,
  },
  orbit: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1,
    alignSelf: 'center',
    top: 62,
  },
  orbitNode: {
    width: 7,
    height: 7,
    borderRadius: 4,
    alignSelf: 'center',
    marginTop: -4,
  },
  platformOuter: {
    position: 'absolute',
    width: 260,
    height: 62,
    borderRadius: 130,
    borderWidth: 1,
    alignSelf: 'center',
    top: 326,
  },
  platformInner: {
    position: 'absolute',
    width: 205,
    height: 42,
    borderRadius: 103,
    alignSelf: 'center',
    top: 336,
  },
  heroImage: {
    position: 'absolute',
    width: '98%',
    height: 360,
    alignSelf: 'center',
    top: 24,
    zIndex: 2,
  },
  classPill: {
    position: 'absolute',
    top: 15,
    left: 15,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(12, 14, 22, 0.82)',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  classPillText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  customizeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(12, 14, 22, 0.82)',
    borderWidth: 1,
    borderColor: '#34394A',
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  customizeButtonText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  evolutionBadge: {
    position: 'absolute',
    zIndex: 5,
    right: 16,
    bottom: 88,
    alignItems: 'flex-end',
    backgroundColor: 'rgba(10, 12, 19, 0.88)',
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  evolutionStage: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  evolutionName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.45,
    marginTop: 2,
  },
  evolutionTitle: {
    color: '#7F879A',
    fontSize: 7,
    marginTop: 2,
  },
  heroIdentity: {
    position: 'absolute',
    zIndex: 5,
    left: 18,
    right: 18,
    bottom: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(10, 12, 19, 0.86)',
    borderWidth: 1,
    borderColor: '#2B3040',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  characterName: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
  },
  characterTitle: {
    color: '#8F96A8',
    fontSize: 8,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 0.75,
    textAlign: 'center',
    marginTop: 3,
  },
  snapshotRow: {
    height: 78,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121520',
    borderWidth: 1,
    borderColor: '#272B39',
    borderRadius: 18,
    marginTop: 12,
  },
  snapshot: {
    flex: 1,
    alignItems: 'center',
  },
  snapshotValue: {
    fontSize: 20,
    fontWeight: '900',
  },
  snapshotLabel: {
    color: '#777F91',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.9,
    marginTop: 3,
  },
  snapshotDivider: {
    width: 1,
    height: 34,
    backgroundColor: '#2B2F3E',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 28,
    marginBottom: 12,
  },
  sectionEyebrow: {
    color: '#777F91',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '900',
    marginTop: 2,
  },
  focusLabel: {
    color: '#8F96A8',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  attributeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 88,
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: '#141725',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  attributeSummaryEyebrow: {
    color: '#737B8F',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.9,
  },
  attributeSummaryValue: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    marginTop: 1,
  },
  attributeSummaryDivider: {
    width: 1,
    height: 45,
    backgroundColor: '#303548',
    marginHorizontal: 14,
  },
  attributeSummaryCopy: {
    flex: 1,
  },
  attributeSummaryTitle: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  attributeSummaryText: {
    color: '#9299AA',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 4,
  },
  powerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#292F41',
    borderRadius: 18,
    backgroundColor: '#10141F',
    padding: 14,
    marginBottom: 10,
  },
  powerIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 14,
  },
  powerEyebrow: {
    color: '#788197',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  powerValue: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  powerMilestone: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#2C3244',
    paddingLeft: 14,
  },
  powerMilestoneLabel: {
    color: '#788197',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },
  powerMilestoneTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    marginTop: 3,
  },
  powerMilestoneText: {
    color: '#9AA3B7',
    fontSize: 9,
    lineHeight: 13,
    marginTop: 3,
  },
  dailyFocusCard: {
    borderWidth: 1,
    borderRadius: 18,
    backgroundColor: '#121621',
    padding: 14,
    marginBottom: 12,
  },
  dailyFocusHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  dailyFocusCopy: { flex: 1 },
  dailyFocusTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  dailyFocusText: {
    color: '#969EB1',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  dailyFocusProgress: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  dailyFocusNode: {
    flex: 1,
    height: 7,
    borderWidth: 1,
    borderColor: '#3A4155',
    borderRadius: 5,
    backgroundColor: '#202536',
  },
  weeklyArcCard: {
    backgroundColor: '#111521',
    borderWidth: 1,
    borderColor: '#31384B',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  weeklyArcTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  weeklyArcIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#1B2030',
  },
  weeklyArcCopy: { flex: 1 },
  weeklyArcEyebrow: {
    color: '#8B7CFF',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  weeklyArcTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  weeklyArcObjective: {
    color: '#929BAD',
    fontSize: 9,
    lineHeight: 14,
    marginTop: 3,
  },
  weeklyArcCount: {
    fontSize: 11,
    fontWeight: '900',
  },
  weeklyArcTrack: {
    height: 8,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#292E3E',
    marginTop: 13,
  },
  weeklyArcFill: {
    height: '100%',
    borderRadius: 5,
  },
  weeklyArcMilestones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  weeklyArcMeta: {
    color: '#6F788C',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
  weeklyArcXp: {
    color: '#AAB2C2',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
    marginTop: 10,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  stat: {
    width: '48%',
    backgroundColor: '#121520',
    borderWidth: 1,
    borderColor: '#272B39',
    borderRadius: 17,
    minHeight: 170,
    padding: 14,
  },
  statFullWidth: {
    width: '100%',
    minHeight: 158,
  },
  statTopRow: {
    minHeight: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statIconShell: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryTag: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  statTags: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statGained: {
    color: '#6F778B',
    fontSize: 6,
    fontWeight: '900',
    letterSpacing: 0.55,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 7,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 31,
  },
  statIdentity: {
    paddingBottom: 2,
  },
  statName: {
    color: '#8F96A8',
    fontSize: 11,
  },
  statRank: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.65,
    marginTop: 2,
  },
  statEffect: {
    color: '#666E82',
    fontSize: 8,
    fontWeight: '700',
    marginTop: 7,
  },
  statProgressTrack: {
    height: 4,
    marginTop: 10,
    borderRadius: 2,
    backgroundColor: '#282C3A',
    overflow: 'hidden',
  },
  statProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  quest: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121520',
    borderWidth: 1,
    borderColor: '#272B39',
    borderRadius: 17,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 9,
  },
  questIconShell: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1F2C',
    marginRight: 12,
  },
  questIcon: {
    fontSize: 21,
  },
  questInfo: {
    flex: 1,
  },
  questTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  questTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  questTitleComplete: {
    color: '#B2B7C3',
  },
  difficulty: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  featuredQuest: {
    alignSelf: 'flex-start',
    marginTop: 3,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },
  questDescription: {
    color: '#747C90',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
    paddingRight: 4,
  },
  reward: {
    fontSize: 10,
    fontWeight: '900',
    marginTop: 4,
  },
  questActionLabel: {
    color: '#747C90',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 3,
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statReward: {
    color: '#8B92A4',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  questJournalBase: {
    backgroundColor: '#121520',
    borderWidth: 1,
    borderColor: '#2D3344',
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  questJournalCard: {
    borderColor: '#3B3566',
    backgroundColor: '#141326',
  },
  questJournalPressed: {
    opacity: 0.82,
  },
  questJournalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  questJournalIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  localOnlyBadge: {
    color: '#B9AEFF',
    backgroundColor: '#292550',
    borderWidth: 1,
    borderColor: '#554B91',
    borderRadius: 9,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 6,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  questToolRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: 13,
  },
  questTool: {
    flex: 1,
    minHeight: 31,
    borderRadius: 9,
    backgroundColor: '#24203D',
    color: '#AFA6DE',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.6,
    textAlign: 'center',
    textAlignVertical: 'center',
    paddingTop: 10,
  },
  questJournalEyebrow: {
    color: '#747C90',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  questJournalTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    marginTop: 2,
  },
  questJournalMessage: {
    color: '#848C9E',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 13,
  },
  activityCard: {
    backgroundColor: '#121520',
    borderWidth: 1,
    borderColor: '#272B39',
    borderRadius: 17,
    paddingHorizontal: 13,
  },
  activityRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#272B39',
  },
  activityRowLast: {
    borderBottomWidth: 0,
  },
  activityGlyph: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#252144',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  activityInfo: {
    flex: 1,
  },
  activityMessage: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  activityTime: {
    color: '#6F7688',
    fontSize: 7,
    fontWeight: '800',
    marginTop: 3,
  },
  activityXp: {
    color: '#54D68A',
    fontSize: 10,
    fontWeight: '900',
  },
  feedbackToast: {
    position: 'absolute',
    left: 22,
    right: 22,
    top: 12,
    zIndex: 30,
    backgroundColor: '#252144',
    borderWidth: 1,
    borderColor: '#635BFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#635BFF',
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  feedbackToastText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.65,
  },
  questGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#11141E',
    borderWidth: 1,
    borderColor: '#272B39',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 9,
  },
  foundationHeader: {
    marginTop: 14,
  },
  questGroupTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  questGroupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  questGroupSubtitle: {
    color: '#71798C',
    fontSize: 9,
    marginTop: 3,
  },
  questGroupCount: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#373C4D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#555B70',
    fontWeight: '900',
  },
  completedCheckText: {
    color: '#FFFFFF',
  },
  skillButton: {
    minHeight: 68,
    borderRadius: 17,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  skillButtonTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  skillButtonSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    marginTop: 4,
  },
  skillButtonArrow: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(4, 5, 10, 0.84)',
  },
  customizerCard: {
    backgroundColor: '#11141E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#2B2F42',
    padding: 20,
    paddingBottom: 32,
  },
  customizerHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#42475A',
    alignSelf: 'center',
    marginBottom: 12,
  },
  customizerHeader: {
    height: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customizerEyebrow: {
    color: '#8B7CFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  customizerTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 4,
  },
  customizerPreview: {
    width: 115,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customizerGlow: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    opacity: 0.18,
  },
  customizerImage: {
    width: 110,
    height: 120,
  },
  fieldLabel: {
    color: '#8F96A8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  nameInput: {
    color: '#FFFFFF',
    backgroundColor: '#191C29',
    borderWidth: 1,
    borderColor: '#303448',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 18,
  },
  appearanceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  appearanceOption: {
    flex: 1,
    minHeight: 126,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#191C29',
    borderWidth: 1,
    borderColor: '#303448',
    borderRadius: 14,
    padding: 8,
  },
  auraSwatch: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  auraSwatchCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    opacity: 0.7,
  },
  appearanceName: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  appearanceDescription: {
    color: '#777F94',
    fontSize: 8,
    lineHeight: 11,
    textAlign: 'center',
    marginTop: 3,
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 17,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
