import AsyncStorage from '@react-native-async-storage/async-storage';

export const QUEST_JOURNAL_STORAGE_KEY = '@ascend/quest-journal-v1';
export const MAX_JOURNAL_ENTRIES = 100;

export type JournalEntry = {
  id: string;
  questId: string;
  questTitle: string;
  note: string;
  savedAt: number;
};

export async function loadJournalEntries() {
  const value = await AsyncStorage.getItem(QUEST_JOURNAL_STORAGE_KEY);
  return parseJournalEntries(value);
}

export async function saveJournalEntries(entries: readonly JournalEntry[]) {
  const normalized = entries
    .filter(isJournalEntry)
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, MAX_JOURNAL_ENTRIES);
  await AsyncStorage.setItem(
    QUEST_JOURNAL_STORAGE_KEY,
    JSON.stringify(normalized),
  );
  return normalized;
}

export function parseJournalEntries(value: string | null): JournalEntry[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
          .filter(isJournalEntry)
          .sort((a, b) => b.savedAt - a.savedAt)
          .slice(0, MAX_JOURNAL_ENTRIES)
      : [];
  } catch {
    return [];
  }
}

function isJournalEntry(value: unknown): value is JournalEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<JournalEntry>;
  return (
    typeof entry.id === 'string' &&
    typeof entry.questId === 'string' &&
    typeof entry.questTitle === 'string' &&
    typeof entry.note === 'string' &&
    entry.note.trim().length > 0 &&
    typeof entry.savedAt === 'number' &&
    Number.isFinite(entry.savedAt)
  );
}
