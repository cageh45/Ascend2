import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { QuestDefinition } from '../game/gameData';
import { getQuestCombatImpact } from '../game/progressionData';
import type { CharacterClassName } from '../game/gameData';
import GameIcon from './GameIcon';

export type ProgressionReward = {
  quest: QuestDefinition;
  xp: number;
  statGain: number;
  previousLevel: number;
  nextLevel: number;
  previousRating: number;
  nextRating: number;
};

export default function ProgressionRewardModal({
  accent,
  characterClass,
  reward,
  onClose,
}: {
  accent: string;
  characterClass: CharacterClassName;
  reward: ProgressionReward | null;
  onClose: () => void;
}) {
  if (!reward) return null;
  const leveledUp = reward.nextLevel > reward.previousLevel;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderColor: `${accent}90` }]}>
          <View style={[styles.glow, { backgroundColor: accent }]} />
          <GameIcon token={leveledUp ? 'status-trophy' : 'progress-xp'} size={76} />
          <Text style={[styles.eyebrow, { color: accent }]}>
            {leveledUp ? 'LEVEL ASCENDED' : 'REAL EFFORT CONVERTED'}
          </Text>
          <Text style={styles.title}>{reward.quest.title}</Text>
          <View style={styles.rewardRow}>
            <Reward value={`+${reward.xp}`} label="XP" accent={accent} />
            <View style={styles.divider} />
            <Reward value={`+${reward.statGain}`} label={reward.quest.stat.toUpperCase()} accent="#65C7FF" />
            <View style={styles.divider} />
            <Reward value={`+${Math.max(0, reward.nextRating - reward.previousRating)}`} label="POWER" accent="#FFCE6A" />
          </View>
          {leveledUp && (
            <View style={[styles.levelBanner, { borderColor: `${accent}80` }]}>
              <Text style={styles.levelLabel}>NEW LEVEL</Text>
              <Text style={[styles.levelValue, { color: accent }]}>{reward.nextLevel}</Text>
              <Text style={styles.levelCopy}>A new skill point is available.</Text>
            </View>
          )}
          <Text style={styles.impact}>
            {getQuestCombatImpact(
              reward.quest,
              characterClass,
              reward.statGain,
            )}
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: accent }]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Continue after quest reward"
          >
            <Text style={styles.buttonText}>CONTINUE ASCENDING</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Reward({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent: string;
}) {
  return (
    <View style={styles.reward}>
      <Text style={[styles.rewardValue, { color: accent }]}>{value}</Text>
      <Text style={styles.rewardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2, 4, 12, 0.88)',
    padding: 22,
  },
  card: {
    width: '100%',
    maxWidth: 430,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 26,
    backgroundColor: '#111522',
    padding: 24,
  },
  glow: {
    position: 'absolute',
    top: -90,
    width: 230,
    height: 180,
    borderRadius: 115,
    opacity: 0.2,
  },
  eyebrow: {
    marginTop: 10,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: {
    marginTop: 8,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'space-around',
    marginTop: 22,
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: '#090C15',
  },
  reward: { flex: 1, alignItems: 'center' },
  rewardValue: { fontSize: 22, fontWeight: '900' },
  rewardLabel: { marginTop: 3, color: '#8A93A8', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  divider: { width: 1, height: 32, backgroundColor: '#272D3D' },
  levelBanner: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: '#171C2B',
    padding: 14,
  },
  levelLabel: { color: '#969EB2', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  levelValue: { marginTop: 2, fontSize: 36, fontWeight: '900' },
  levelCopy: { color: '#DCE1ED', fontSize: 12, fontWeight: '700' },
  impact: {
    marginTop: 18,
    color: '#B8C0D1',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    alignSelf: 'stretch',
    alignItems: 'center',
    marginTop: 22,
    borderRadius: 15,
    paddingVertical: 15,
  },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});
