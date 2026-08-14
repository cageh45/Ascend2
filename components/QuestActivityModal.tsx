import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import GameIcon from './GameIcon';

import type { QuestDefinition } from '../game/gameData';
import { getQuestActivity } from '../game/questActivityData';

const PROGRESS_PREFIX = '@ascend/quest-activity-v1';
const JOURNAL_KEY = '@ascend/quest-journal-v1';

type QuestProgress = {
  timerEndAt: number | null;
  timerRemainingSeconds: number | null;
  timerStarted: boolean;
  counterValue: number;
  checkedIndices: number[];
  journalDraft: string;
};

type JournalEntry = {
  id: string;
  questId: string;
  questTitle: string;
  note: string;
  savedAt: number;
};

type Props = {
  accent: string;
  onClose: () => void;
  onComplete: (quest: QuestDefinition) => void;
  quest: QuestDefinition | null;
  rewardXp?: number;
  statGain?: number;
  visible: boolean;
};

export default function QuestActivityModal({
  accent,
  onClose,
  onComplete,
  quest,
  rewardXp,
  statGain = 1,
  visible,
}: Props) {
  const activity = quest ? getQuestActivity(quest) : undefined;
  const [hydrated, setHydrated] = useState(false);
  const [progress, setProgress] = useState<QuestProgress>(() =>
    createInitialProgress(activity),
  );
  const [now, setNow] = useState(Date.now());
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const claimInFlight = useRef(false);

  const progressKey = quest
    ? `${PROGRESS_PREFIX}:${getDayKey()}:${quest.id}`
    : null;
  const lastEntry = useMemo(
    () => journalEntries.find((entry) => entry.questId === quest?.id),
    [journalEntries, quest?.id],
  );

  useEffect(() => {
    if (!visible || !quest || !activity || !progressKey) return;
    let cancelled = false;
    claimInFlight.current = false;
    setClaiming(false);
    setHydrated(false);
    setStorageError(null);
    setNow(Date.now());

    void Promise.all([
      AsyncStorage.getItem(progressKey),
      AsyncStorage.getItem(JOURNAL_KEY),
    ])
      .then(([storedProgress, storedJournal]) => {
        if (cancelled) return;
        setProgress(restoreProgress(storedProgress, activity));
        setJournalEntries(restoreJournal(storedJournal));
        setHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setProgress(createInitialProgress(activity));
        setJournalEntries([]);
        setStorageError('Saved quest progress could not be loaded.');
        setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [activity, progressKey, quest, visible]);

  useEffect(() => {
    if (!visible || !hydrated || !progressKey) return;
    void AsyncStorage.setItem(progressKey, JSON.stringify(progress)).catch(() =>
      setStorageError('Quest progress could not be saved on this device.'),
    );
  }, [hydrated, progress, progressKey, visible]);

  useEffect(() => {
    if (!visible || !progress.timerEndAt) return;
    const interval = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(interval);
  }, [progress.timerEndAt, visible]);

  if (!quest || !activity) return null;

  const selectedQuest = quest;
  const selectedActivity = activity;

  const remainingSeconds = getRemainingSeconds(progress, activity, now);
  const timerRunning = Boolean(progress.timerEndAt && remainingSeconds > 0);
  const timerFinished =
    activity.type === 'timer' &&
    progress.timerStarted &&
    remainingSeconds === 0;
  const canComplete =
    activity.type === 'timer'
      ? timerFinished
      : activity.type === 'counter'
        ? progress.counterValue >= activity.target
        : activity.type === 'journal'
          ? progress.journalDraft.trim().length >=
            (activity.minimumCharacters ?? 1)
          : progress.checkedIndices.length === activity.items.length;

  function startTimer() {
    if (selectedActivity.type !== 'timer') return;
    const seconds = Math.max(
      1,
      remainingSeconds || selectedActivity.durationSeconds,
    );
    setNow(Date.now());
    setProgress((current) => ({
      ...current,
      timerEndAt: Date.now() + seconds * 1000,
      timerRemainingSeconds: seconds,
      timerStarted: true,
    }));
  }

  function pauseTimer() {
    const seconds = getRemainingSeconds(
      progress,
      selectedActivity,
      Date.now(),
    );
    setProgress((current) => ({
      ...current,
      timerEndAt: null,
      timerRemainingSeconds: seconds,
    }));
  }

  function resetTimer() {
    if (selectedActivity.type !== 'timer') return;
    setProgress((current) => ({
      ...current,
      timerEndAt: null,
      timerRemainingSeconds: selectedActivity.durationSeconds,
      timerStarted: false,
    }));
  }

  function changeCounter(delta: number) {
    if (selectedActivity.type !== 'counter') return;
    setProgress((current) => ({
      ...current,
      counterValue: Math.max(
        0,
        Math.min(selectedActivity.target, current.counterValue + delta),
      ),
    }));
    if (delta > 0) void Haptics.selectionAsync();
  }

  function toggleChecklist(index: number) {
    setProgress((current) => ({
      ...current,
      checkedIndices: current.checkedIndices.includes(index)
        ? current.checkedIndices.filter((value) => value !== index)
        : [...current.checkedIndices, index],
    }));
    void Haptics.selectionAsync();
  }

  async function claimQuest() {
    if (!canComplete || !progressKey || claimInFlight.current) return;
    claimInFlight.current = true;
    setClaiming(true);

    try {
      if (selectedActivity.type === 'journal') {
        const entry: JournalEntry = {
          id: `${Date.now()}-${selectedQuest.id}`,
          questId: selectedQuest.id,
          questTitle: selectedQuest.title,
          note: progress.journalDraft.trim(),
          savedAt: Date.now(),
        };
        const nextEntries = [entry, ...journalEntries].slice(0, 100);
        setJournalEntries(nextEntries);
        await AsyncStorage.setItem(JOURNAL_KEY, JSON.stringify(nextEntries));
      }
      await AsyncStorage.removeItem(progressKey);
    } catch {
      claimInFlight.current = false;
      setClaiming(false);
      setStorageError(
        'This quest could not be saved. Free device storage and try again.',
      );
      return;
    }

    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);

    // Dismiss the native modal before its parent quest list changes. Updating
    // both native view trees in one frame can destabilize Fabric on devices.
    onClose();
    requestAnimationFrame(() => onComplete(selectedQuest));
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close quest activity"
        />
        <View style={styles.card}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={[styles.iconShell, { borderColor: `${accent}80` }]}>
              <GameIcon token={quest.icon} size={44} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.eyebrow, { color: accent }]}>GUIDED QUEST</Text>
              <Text style={styles.title}>{quest.title}</Text>
              <Text style={styles.reward}>+{rewardXp ?? quest.reward} XP · +{statGain} {quest.stat.toUpperCase()}</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          {!hydrated ? (
            <View style={styles.loading}>
              <ActivityIndicator color={accent} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {storageError && (
                <Text style={styles.storageError}>{storageError}</Text>
              )}
              {activity.type === 'timer' && (
                <>
                  <Text style={styles.instruction}>{activity.instruction}</Text>
                  <View style={[styles.timerOrb, { borderColor: accent }]}>
                    <Text style={styles.timerValue}>{formatTimer(remainingSeconds)}</Text>
                    <Text style={styles.timerLabel}>
                      {timerFinished ? 'SESSION COMPLETE' : timerRunning ? 'STAY PRESENT' : 'READY'}
                    </Text>
                  </View>
                  <View style={styles.timerActions}>
                    {!timerFinished && (
                      <Pressable
                        style={[styles.secondaryButton, { borderColor: `${accent}AA` }]}
                        onPress={timerRunning ? pauseTimer : startTimer}
                      >
                        <Text style={[styles.secondaryButtonText, { color: accent }]}> 
                          {timerRunning ? 'PAUSE' : remainingSeconds < activity.durationSeconds ? 'RESUME' : 'START'}
                        </Text>
                      </Pressable>
                    )}
                    {remainingSeconds < activity.durationSeconds && !timerRunning && (
                      <Pressable style={styles.resetButton} onPress={resetTimer}>
                        <Text style={styles.resetText}>RESET</Text>
                      </Pressable>
                    )}
                  </View>
                  <Text style={styles.privacyNote}>
                    The end time is saved on this device, so the countdown survives backgrounding and app restarts.
                  </Text>
                </>
              )}

              {activity.type === 'counter' && (
                <>
                  <Text style={styles.instruction}>{activity.instruction}</Text>
                  <View style={styles.counterCard}>
                    <Text style={styles.counterValue}>{progress.counterValue}</Text>
                    <Text style={styles.counterTarget}>OF {activity.target} {activity.unit.toUpperCase()}</Text>
                    <View style={styles.counterActions}>
                      <Pressable style={styles.counterButton} onPress={() => changeCounter(-activity.step)}>
                        <Text style={styles.counterButtonText}>−</Text>
                      </Pressable>
                      <Pressable
                        style={[styles.counterButton, styles.counterAdd, { backgroundColor: accent }]}
                        onPress={() => changeCounter(activity.step)}
                      >
                        <Text style={styles.counterAddText}>+{activity.step.toLocaleString()}</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}

              {activity.type === 'journal' && (
                <>
                  <Text style={styles.prompt}>{activity.prompt}</Text>
                  <TextInput
                    value={progress.journalDraft}
                    onChangeText={(journalDraft) =>
                      setProgress((current) => ({ ...current, journalDraft }))
                    }
                    style={[styles.journalInput, { borderColor: `${accent}70` }]}
                    placeholder={activity.placeholder}
                    placeholderTextColor="#626A7C"
                    selectionColor={accent}
                    multiline
                    textAlignVertical="top"
                    maxLength={2000}
                  />
                  <View style={styles.journalMeta}>
                    <Text style={styles.privacyNote}>Saved on this device</Text>
                    <Text style={styles.characterCount}>{progress.journalDraft.trim().length}/2000</Text>
                  </View>
                  {lastEntry && (
                    <View style={styles.lastEntry}>
                      <Text style={styles.lastEntryLabel}>LAST CHECK-IN · {formatEntryDate(lastEntry.savedAt)}</Text>
                      <Text style={styles.lastEntryText} numberOfLines={4}>{lastEntry.note}</Text>
                    </View>
                  )}
                </>
              )}

              {activity.type === 'checklist' && (
                <>
                  <Text style={styles.instruction}>{activity.instruction}</Text>
                  <View style={styles.checklist}>
                    {activity.items.map((item, index) => {
                      const checked = progress.checkedIndices.includes(index);
                      return (
                        <Pressable
                          key={item}
                          style={styles.checklistRow}
                          onPress={() => toggleChecklist(index)}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked }}
                        >
                          <View
                            style={[
                              styles.checkBox,
                              checked && { backgroundColor: accent, borderColor: accent },
                            ]}
                          >
                            {checked && <Text style={styles.checkMark}>✓</Text>}
                          </View>
                          <Text style={[styles.checklistText, checked && styles.checkedText]}>{item}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              )}

              <Pressable
                style={[
                  styles.claimButton,
                  { backgroundColor: accent },
                  (!canComplete || claiming) && styles.claimButtonDisabled,
                ]}
                onPress={claimQuest}
                disabled={!canComplete || claiming}
                accessibilityRole="button"
              >
                <Text style={styles.claimButtonText}>
                  {claiming
                    ? 'CLAIMING REWARD...'
                    : canComplete
                      ? 'CLAIM QUEST REWARD'
                      : getIncompleteLabel(activity.type)}
                </Text>
              </Pressable>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createInitialProgress(
  activity: ReturnType<typeof getQuestActivity> | undefined,
): QuestProgress {
  return {
    timerEndAt: null,
    timerRemainingSeconds:
      activity?.type === 'timer' ? activity.durationSeconds : null,
    timerStarted: false,
    counterValue: 0,
    checkedIndices: [],
    journalDraft: '',
  };
}

function restoreProgress(
  value: string | null,
  activity: NonNullable<ReturnType<typeof getQuestActivity>>,
): QuestProgress {
  const initial = createInitialProgress(activity);
  if (!value) return initial;
  try {
    const parsed = JSON.parse(value) as Partial<QuestProgress>;
    return {
      timerEndAt: typeof parsed.timerEndAt === 'number' ? parsed.timerEndAt : null,
      timerRemainingSeconds:
        typeof parsed.timerRemainingSeconds === 'number'
          ? Math.max(0, parsed.timerRemainingSeconds)
          : initial.timerRemainingSeconds,
      timerStarted: parsed.timerStarted === true,
      counterValue:
        typeof parsed.counterValue === 'number'
          ? Math.max(0, parsed.counterValue)
          : 0,
      checkedIndices: Array.isArray(parsed.checkedIndices)
        ? parsed.checkedIndices.filter((index): index is number => typeof index === 'number')
        : [],
      journalDraft:
        typeof parsed.journalDraft === 'string' ? parsed.journalDraft : '',
    };
  } catch {
    return initial;
  }
}

function restoreJournal(value: string | null): JournalEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getRemainingSeconds(
  progress: QuestProgress,
  activity: NonNullable<ReturnType<typeof getQuestActivity>>,
  now: number,
) {
  if (activity.type !== 'timer') return 0;
  if (progress.timerEndAt) {
    return Math.max(0, Math.ceil((progress.timerEndAt - now) / 1000));
  }
  return progress.timerRemainingSeconds ?? activity.durationSeconds;
}

function getDayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTimer(seconds: number) {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function formatEntryDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  }).toUpperCase();
}

function getIncompleteLabel(type: string) {
  if (type === 'timer') return 'FINISH THE SESSION';
  if (type === 'counter') return 'REACH THE TARGET';
  if (type === 'journal') return 'WRITE YOUR CHECK-IN';
  return 'FINISH THE CHECKLIST';
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(3, 4, 9, 0.78)',
  },
  card: {
    maxHeight: '90%',
    minHeight: 420,
    backgroundColor: '#11141F',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#2A3040',
    overflow: 'hidden',
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A4052',
    alignSelf: 'center',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#252A38',
  },
  iconShell: {
    width: 50,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#191D29',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 25 },
  headerText: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.6 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 3 },
  reward: { color: '#8F96A8', fontSize: 9, fontWeight: '800', marginTop: 4 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1D2130',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#BFC5D4', fontSize: 25, lineHeight: 27 },
  loading: { minHeight: 320, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 18, paddingBottom: 30 },
  storageError: { color: '#FF9EAD', fontSize: 10, lineHeight: 15, textAlign: 'center', marginBottom: 12 },
  instruction: { color: '#C7CCDA', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  timerOrb: {
    width: 196,
    height: 196,
    borderRadius: 98,
    borderWidth: 4,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    backgroundColor: '#171B27',
  },
  timerValue: { color: '#FFFFFF', fontSize: 43, fontWeight: '900', letterSpacing: 1 },
  timerLabel: { color: '#858DA0', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 5 },
  timerActions: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 22 },
  secondaryButton: {
    minWidth: 142,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  resetButton: { paddingHorizontal: 18, paddingVertical: 14 },
  resetText: { color: '#858DA0', fontSize: 10, fontWeight: '900' },
  privacyNote: { color: '#747C8F', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 12 },
  counterCard: {
    alignItems: 'center',
    backgroundColor: '#171B27',
    borderWidth: 1,
    borderColor: '#2A3040',
    borderRadius: 24,
    marginTop: 22,
    padding: 24,
  },
  counterValue: { color: '#FFFFFF', fontSize: 66, lineHeight: 72, fontWeight: '900' },
  counterTarget: { color: '#858DA0', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  counterActions: { flexDirection: 'row', gap: 12, marginTop: 22 },
  counterButton: {
    width: 62,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3A4052',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterAdd: { width: 100, borderWidth: 0 },
  counterButtonText: { color: '#BCC2D0', fontSize: 28, fontWeight: '700' },
  counterAddText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  prompt: { color: '#FFFFFF', fontSize: 17, lineHeight: 24, fontWeight: '800' },
  journalInput: {
    minHeight: 190,
    marginTop: 16,
    padding: 15,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: '#171B27',
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 21,
  },
  journalMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  characterCount: { color: '#747C8F', fontSize: 9, fontWeight: '800', marginTop: 12 },
  lastEntry: { marginTop: 18, padding: 14, borderRadius: 14, backgroundColor: '#191D29' },
  lastEntryLabel: { color: '#7E869A', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  lastEntryText: { color: '#BFC5D4', fontSize: 12, lineHeight: 18, marginTop: 8 },
  checklist: { marginTop: 18, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#292E3E' },
  checklistRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#292E3E', backgroundColor: '#171B27' },
  checkBox: { width: 25, height: 25, borderRadius: 8, borderWidth: 1, borderColor: '#4A5266', alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  checklistText: { flex: 1, color: '#D2D6E1', fontSize: 13, fontWeight: '700' },
  checkedText: { color: '#798195', textDecorationLine: 'line-through' },
  claimButton: { minHeight: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  claimButtonDisabled: { opacity: 0.28 },
  claimButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
});
