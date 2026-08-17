import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  JournalEntry,
  loadJournalEntries,
} from '../game/journalData';
import GameIcon from './GameIcon';

type Props = {
  accent: string;
  onClose: () => void;
  visible: boolean;
};

export default function QuestJournalModal({ accent, onClose, visible }: Props) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let mounted = true;
    setLoading(true);
    setErrorMessage(null);
    void loadJournalEntries()
      .then((storedEntries) => {
        if (mounted) setEntries(storedEntries);
      })
      .catch(() => {
        if (mounted) {
          setEntries([]);
          setErrorMessage('Your saved check-ins could not be loaded.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close quest journal"
        />
        <View style={styles.card}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={[styles.iconShell, { borderColor: `${accent}80` }]}>
              <GameIcon token="quest-journal" size={42} />
            </View>
            <View style={styles.headerCopy}>
              <Text style={[styles.eyebrow, { color: accent }]}>PRIVATE · ON DEVICE</Text>
              <Text style={styles.title}>Quest Journal</Text>
              <Text style={styles.count}>{entries.length} SAVED CHECK-INS</Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={accent} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
              {!errorMessage && entries.length === 0 && (
                <View style={styles.emptyCard}>
                  <GameIcon token="quest-notes" size={48} />
                  <Text style={styles.emptyTitle}>Your journal is ready</Text>
                  <Text style={styles.emptyText}>
                    Complete a journal or check-in quest. Your full entry will appear here after you claim it.
                  </Text>
                </View>
              )}
              {entries.map((entry) => (
                <View key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryQuest}>{entry.questTitle}</Text>
                    <Text style={[styles.entryDate, { color: accent }]}>
                      {formatJournalDate(entry.savedAt)}
                    </Text>
                  </View>
                  <Text style={styles.entryNote}>{entry.note}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function formatJournalDate(timestamp: number) {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).toUpperCase();
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(3, 4, 9, 0.8)',
  },
  card: {
    maxHeight: '88%',
    minHeight: 480,
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
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', marginTop: 2 },
  count: { color: '#858DA0', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1D2130',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: '#BFC5D4', fontSize: 25, lineHeight: 27 },
  loading: { minHeight: 340, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 18, paddingBottom: 36, gap: 12 },
  error: { color: '#FF9EAD', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  emptyCard: {
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A3040',
    backgroundColor: '#171B27',
  },
  emptyTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '900', marginTop: 14 },
  emptyText: { color: '#858DA0', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 7 },
  entryCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A3040',
    backgroundColor: '#171B27',
  },
  entryHeader: { gap: 5, marginBottom: 10 },
  entryQuest: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  entryDate: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  entryNote: { color: '#C7CCDA', fontSize: 13, lineHeight: 20 },
});
