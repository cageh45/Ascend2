import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { CHARACTER_CLASSES, getLevelProgress } from '../game/gameData';
import {
  canUnlockSkill,
  getSkillPoints,
  SkillNode,
  SKILL_PATHS,
  SKILL_TREES,
} from '../game/skillData';
import { useGame } from '../state/GameContext';
import { SKILLS_MUSIC } from '../game/musicData';
import { useMusic } from '../state/MusicContext';
import GameIcon from '../components/GameIcon';

export default function SkillTreeScreen() {
  const {
    characterClass,
    resetSkills,
    skillPointsAvailable,
    totalXp,
    unlockedSkillIds,
    unlockSkill,
  } = useGame();
  const { playTrack } = useMusic();
  const character = CHARACTER_CLASSES[characterClass];
  const paths = SKILL_PATHS[characterClass];
  const skills = SKILL_TREES[characterClass];
  const levelProgress = getLevelProgress(totalXp);
  const points = getSkillPoints(
    levelProgress.level,
    skills,
    unlockedSkillIds,
  );
  const [selectedId, setSelectedId] = useState(skills[0].id);
  const selectedSkill =
    skills.find((skill) => skill.id === selectedId) ?? skills[0];
  const selectedUnlocked = unlockedSkillIds.includes(selectedSkill.id);
  const selectedCanUnlock = canUnlockSkill(
    selectedSkill,
    levelProgress.level,
    skillPointsAvailable,
    unlockedSkillIds,
  );

  useFocusEffect(
    useCallback(() => playTrack(SKILLS_MUSIC[characterClass]), [characterClass, playTrack]),
  );

  function selectSkill(skill: SkillNode) {
    setSelectedId(skill.id);
    void Haptics.selectionAsync().catch(() => undefined);
  }

  function unlockSelectedSkill() {
    if (!selectedCanUnlock) return;
    unlockSkill(selectedSkill.id);
    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
  }

  function getRequirementText(skill: SkillNode) {
    if (unlockedSkillIds.includes(skill.id)) {
      return skill.kind === 'active'
        ? 'Equipped automatically in Raid'
        : 'Passive bonus is active';
    }
    if (levelProgress.level < skill.requiredLevel) {
      return `Reach level ${skill.requiredLevel}`;
    }
    if (skill.parentIds.length > 0) {
      const hasParents = skill.requiresAllParents
        ? skill.parentIds.every((id) => unlockedSkillIds.includes(id))
        : skill.parentIds.some((id) => unlockedSkillIds.includes(id));
      if (!hasParents) {
        return skill.requiresAllParents
          ? 'Master both connected branches first'
          : 'Unlock a connected skill first';
      }
    }
    if (skillPointsAvailable < skill.cost) {
      return `Need ${skill.cost - skillPointsAvailable} more skill point${
        skill.cost - skillPointsAvailable === 1 ? '' : 's'
      }`;
    }
    return 'Ready to unlock';
  }

  const tiers = Array.from(new Set(skills.map((skill) => skill.tier)))
    .sort((left, right) => left - right)
    .map((tier) => ({
      tier,
      skills: skills.filter((skill) => skill.tier === tier),
    }));
  const nextMilestone = skills
    .filter((skill) => skill.requiredLevel > levelProgress.level)
    .sort((left, right) => left.requiredLevel - right.requiredLevel)[0];

  function confirmResetSkills() {
    Alert.alert(
      'Reset skill path?',
      'All spent points will be returned. Your starter ability stays unlocked.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetSkills();
            setSelectedId(skills[0].id);
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>ASCENDANT PROGRESSION</Text>
            <Text style={styles.header}>SKILL TREE</Text>
          </View>
          <View
            style={[
              styles.pointBadge,
              skillPointsAvailable > 0 && { borderColor: character.color },
            ]}
          >
            <Text style={styles.pointValue}>{skillPointsAvailable}</Text>
            <Text style={styles.pointLabel}>POINTS</Text>
          </View>
        </View>

        <View style={[styles.pathHeader, { borderColor: character.color }]}>
          <View
            style={[
              styles.pathIconContainer,
              { backgroundColor: `${character.color}22` },
            ]}
          >
            <GameIcon token={character.icon} size={44} />
          </View>
          <View style={styles.pathInfo}>
            <Text style={styles.pathTitle}>{characterClass.toUpperCase()}</Text>
            <Text style={styles.pathSubtitle}>
              LEVEL {levelProgress.level} · {totalXp} TOTAL XP
            </Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressTitle}>NEXT LEVEL</Text>
            <Text style={styles.progressValue}>
              {levelProgress.currentXp} / {levelProgress.xpForNextLevel} XP
            </Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: levelProgress.progressPercent,
                  backgroundColor: character.color,
                },
              ]}
            />
          </View>
          <Text style={styles.progressHint}>
            Reach {levelProgress.nextLevelXp} total XP to earn your next skill point.
          </Text>
          <View style={styles.journeyRow}>
            <View>
              <Text style={styles.journeyValue}>{unlockedSkillIds.length} / {skills.length}</Text>
              <Text style={styles.journeyLabel}>SKILLS MASTERED</Text>
            </View>
            <View style={styles.journeyRight}>
              <Text style={styles.journeyValue}>
                {nextMilestone ? `LV ${nextMilestone.requiredLevel}` : 'COMPLETE'}
              </Text>
              <Text style={styles.journeyLabel}>NEXT TIER</Text>
            </View>
          </View>
        </View>

        <View style={styles.selectedCard}>
          <View style={styles.selectedHeader}>
            <View
              style={[
                styles.selectedIcon,
                selectedUnlocked && { borderColor: character.color },
              ]}
            >
              <GameIcon token={selectedSkill.icon} size={52} />
            </View>
            <View style={styles.selectedInfo}>
              <View style={styles.skillTypeRow}>
                <Text
                  style={[
                    styles.skillType,
                    selectedSkill.kind === 'active' && styles.activeType,
                  ]}
                >
                  {selectedSkill.kind.toUpperCase()} ABILITY
                </Text>
                <Text style={styles.skillCost}>
                  {selectedSkill.cost === 0
                    ? 'STARTER'
                    : `${selectedSkill.cost} PT${selectedSkill.cost === 1 ? '' : 'S'}`}
                </Text>
              </View>
              <Text style={styles.selectedName}>{selectedSkill.name}</Text>
            </View>
          </View>

          <Text style={styles.selectedDescription}>
            {selectedSkill.description}
          </Text>
          <View style={styles.effectBox}>
            <Text style={styles.effectLabel}>EFFECT</Text>
            <Text style={styles.effectText}>{selectedSkill.effectText}</Text>
          </View>

          {selectedUnlocked ? (
            <View style={[styles.unlockButton, styles.unlockedButton]}>
              <Text style={[styles.unlockButtonText, { color: character.color }]}>✓ UNLOCKED</Text>
              <Text style={styles.unlockHint}>
                {getRequirementText(selectedSkill)}
              </Text>
            </View>
          ) : (
            <Pressable
              style={[
                styles.unlockButton,
                selectedCanUnlock && { backgroundColor: character.color },
                !selectedCanUnlock && styles.lockedButton,
              ]}
              onPress={unlockSelectedSkill}
              disabled={!selectedCanUnlock}
              accessibilityRole="button"
              accessibilityState={{ disabled: !selectedCanUnlock }}
              accessibilityLabel={`Unlock ${selectedSkill.name}`}
            >
              <Text style={styles.unlockButtonText}>
                {selectedCanUnlock ? `UNLOCK FOR ${selectedSkill.cost}` : 'LOCKED'}
              </Text>
              <Text style={styles.unlockHint}>
                {getRequirementText(selectedSkill)}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={styles.treeHeader}>
          <View>
            <Text style={styles.sectionTitle}>YOUR PATH</Text>
            <Text style={styles.spentText}>{points.spent} / {points.earned} POINTS SPENT</Text>
          </View>
          {points.spent > 0 && (
            <Pressable style={styles.resetButton} onPress={confirmResetSkills}>
              <Text style={styles.resetButtonText}>RESET PATH</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.tree}>
          {tiers.map((tier, index) => {
            const nextTier = tiers[index + 1];
            return (
              <React.Fragment key={tier.tier}>
                {tier.tier === 4 && (
                  <View style={styles.pathSplitRow}>
                    <View style={[styles.pathPill, { borderColor: `${character.color}80` }]}>
                      <Text style={[styles.pathPillText, { color: character.color }]}>{paths.left.toUpperCase()}</Text>
                    </View>
                    <View style={[styles.pathPill, { borderColor: `${character.color}80` }]}>
                      <Text style={[styles.pathPillText, { color: character.color }]}>{paths.right.toUpperCase()}</Text>
                    </View>
                  </View>
                )}
                <View style={styles.tierHeading}>
                  <Text style={[styles.tierRank, { color: character.color }]}>RANK {tier.tier + 1}</Text>
                  <Text style={styles.tierRequirement}>LEVEL {tier.skills[0].requiredLevel}</Text>
                </View>
                <SkillTier
                  skills={tier.skills}
                  selectedId={selectedSkill.id}
                  unlockedIds={unlockedSkillIds}
                  accent={character.color}
                  onSelect={selectSkill}
                />
                {nextTier && (
                  <TreeConnector
                    type={getConnectorType(tier.skills.length, nextTier.skills.length)}
                    active={nextTier.skills.some((skill) => unlockedSkillIds.includes(skill.id))}
                    accent={character.color}
                  />
                )}
              </React.Fragment>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SkillTier({
  skills,
  selectedId,
  unlockedIds,
  accent,
  onSelect,
}: {
  skills: readonly SkillNode[];
  selectedId: string;
  unlockedIds: readonly string[];
  accent: string;
  onSelect: (skill: SkillNode) => void;
}) {
  return (
    <View style={styles.tierRow}>
      {skills.map((skill) => {
        const unlocked = unlockedIds.includes(skill.id);
        const selected = selectedId === skill.id;

        return (
          <Pressable
            key={skill.id}
            style={styles.nodeColumn}
            onPress={() => onSelect(skill)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${skill.name}, ${unlocked ? 'unlocked' : 'locked'}`}
          >
            <View
              style={[
                styles.node,
                unlocked && {
                  borderColor: accent,
                  backgroundColor: `${accent}22`,
                },
                selected && { borderColor: '#FFFFFF' },
              ]}
            >
              <GameIcon
                token={skill.icon}
                size={44}
                style={!unlocked ? styles.lockedIcon : undefined}
              />
              {skill.cost > 0 && !unlocked && (
                <View style={styles.nodeCost}>
                  <Text style={styles.nodeCostText}>{skill.cost}</Text>
                </View>
              )}
              {unlocked && (
                <View style={[styles.nodeCheck, { backgroundColor: accent }]}>
                  <Text style={styles.nodeCheckText}>✓</Text>
                </View>
              )}
            </View>
            <Text
              numberOfLines={2}
              style={[styles.nodeName, selected && { color: '#FFFFFF' }]}
            >
              {skill.name}
            </Text>
            <Text style={styles.nodeLevel}>LV {skill.requiredLevel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function TreeConnector({
  type,
  active,
  accent,
}: {
  type: 'split' | 'parallel' | 'merge' | 'center';
  active: boolean;
  accent: string;
}) {
  const lineColor = active ? accent : '#303447';

  if (type === 'center') {
    return (
      <View style={styles.connector}>
        <View style={[styles.centerLine, { backgroundColor: lineColor }]} />
      </View>
    );
  }

  if (type === 'parallel') {
    return (
      <View style={styles.connector}>
        <View style={[styles.parallelLine, styles.leftLine, { backgroundColor: lineColor }]} />
        <View style={[styles.parallelLine, styles.rightLine, { backgroundColor: lineColor }]} />
      </View>
    );
  }

  if (type === 'merge') {
    return (
      <View style={styles.connector}>
        <View style={[styles.connectorHorizontal, styles.mergeHorizontal, { backgroundColor: lineColor }]} />
        <View style={[styles.mergeSideStem, styles.leftLine, { backgroundColor: lineColor }]} />
        <View style={[styles.mergeSideStem, styles.rightLine, { backgroundColor: lineColor }]} />
        <View style={[styles.mergeCenterStem, { backgroundColor: lineColor }]} />
      </View>
    );
  }

  return (
    <View style={styles.connector}>
      <View
        style={[
          styles.connectorHorizontal,
          { backgroundColor: lineColor },
        ]}
      />
      <View style={[styles.connectorStem, styles.centerStem, { backgroundColor: lineColor }]} />
      <View style={[styles.connectorStem, styles.leftStem, { backgroundColor: lineColor }]} />
      <View style={[styles.connectorStem, styles.rightStem, { backgroundColor: lineColor }]} />
    </View>
  );
}

function getConnectorType(
  currentCount: number,
  nextCount: number,
): 'split' | 'parallel' | 'merge' | 'center' {
  if (currentCount === 1 && nextCount > 1) return 'split';
  if (currentCount > 1 && nextCount === 1) return 'merge';
  if (currentCount > 1 && nextCount > 1) return 'parallel';
  return 'center';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0D14',
  },
  content: {
    padding: 20,
    paddingBottom: 50,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eyebrow: {
    color: '#8B7CFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  header: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 3,
  },
  pointBadge: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171A27',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#303447',
  },
  pointValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  pointLabel: {
    color: '#7D8497',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151827',
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
    marginTop: 22,
  },
  pathIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    marginRight: 13,
  },
  pathIcon: {
    fontSize: 27,
  },
  pathInfo: {
    flex: 1,
  },
  pathTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.6,
  },
  pathSubtitle: {
    color: '#8F96A8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: '#121520',
    borderRadius: 15,
    padding: 14,
    marginTop: 12,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressTitle: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  progressValue: {
    color: '#A7ADBC',
    fontSize: 10,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#292D3D',
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: 9,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressHint: {
    color: '#6F768A',
    fontSize: 9,
    marginTop: 8,
  },
  journeyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#292D3D',
    marginTop: 12,
    paddingTop: 11,
  },
  journeyRight: {
    alignItems: 'flex-end',
  },
  journeyValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  journeyLabel: {
    color: '#686F82',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  selectedCard: {
    backgroundColor: '#151827',
    borderWidth: 1,
    borderColor: '#2C3041',
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedIcon: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E2130',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#333749',
  },
  selectedEmoji: {
    fontSize: 29,
  },
  selectedInfo: {
    flex: 1,
    marginLeft: 13,
  },
  skillTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillType: {
    color: '#59E398',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  activeType: {
    color: '#FFB45E',
  },
  skillCost: {
    color: '#747B8F',
    fontSize: 8,
    fontWeight: '900',
  },
  selectedName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    marginTop: 3,
  },
  selectedDescription: {
    color: '#9299AA',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 13,
  },
  effectBox: {
    backgroundColor: '#10131C',
    borderRadius: 11,
    padding: 11,
    marginTop: 12,
  },
  effectLabel: {
    color: '#686F82',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  effectText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  unlockButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    borderRadius: 12,
    marginTop: 13,
    paddingHorizontal: 12,
  },
  unlockedButton: {
    backgroundColor: '#1C2030',
    borderWidth: 1,
    borderColor: '#323749',
  },
  lockedButton: {
    backgroundColor: '#222532',
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  unlockHint: {
    color: '#969DAF',
    fontSize: 9,
    marginTop: 3,
  },
  treeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  spentText: {
    color: '#747B8F',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 3,
  },
  resetButton: {
    borderWidth: 1,
    borderColor: '#3A3F52',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  resetButtonText: {
    color: '#A6ADBE',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  tree: {
    alignItems: 'stretch',
    backgroundColor: '#10121B',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#242838',
    paddingHorizontal: 10,
    paddingVertical: 22,
  },
  tierHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  pathSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
    marginBottom: 14,
  },
  pathPill: {
    width: '44%',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 999,
    backgroundColor: '#171A27',
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  pathPillText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  tierRank: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  tierRequirement: {
    color: '#62697B',
    fontSize: 8,
    fontWeight: '900',
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  nodeColumn: {
    width: '45%',
    alignItems: 'center',
  },
  node: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171A27',
    borderWidth: 2,
    borderColor: '#303447',
  },
  nodeIcon: {
    fontSize: 29,
  },
  lockedIcon: {
    opacity: 0.36,
  },
  nodeCost: {
    position: 'absolute',
    right: -3,
    top: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#303447',
  },
  nodeCostText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  nodeCheck: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeCheckText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  nodeName: {
    color: '#7E8598',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 8,
    minHeight: 28,
  },
  nodeLevel: {
    color: '#555C70',
    fontSize: 8,
    fontWeight: '900',
    marginTop: 2,
  },
  connector: {
    height: 45,
    position: 'relative',
  },
  centerLine: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
  },
  connectorHorizontal: {
    position: 'absolute',
    left: '25%',
    right: '25%',
    top: 18,
    height: 2,
  },
  mergeHorizontal: {
    top: 25,
  },
  mergeSideStem: {
    position: 'absolute',
    width: 2,
    top: 0,
    height: 27,
  },
  mergeCenterStem: {
    position: 'absolute',
    left: '50%',
    top: 25,
    bottom: 0,
    width: 2,
  },
  connectorStem: {
    position: 'absolute',
    width: 2,
  },
  centerStem: {
    left: '50%',
    top: 0,
    height: 20,
  },
  leftStem: {
    left: '25%',
    top: 18,
    bottom: 0,
  },
  rightStem: {
    right: '25%',
    top: 18,
    bottom: 0,
  },
  parallelLine: {
    position: 'absolute',
    width: 2,
    top: 0,
    bottom: 0,
  },
  leftLine: {
    left: '25%',
  },
  rightLine: {
    right: '25%',
  },
});
