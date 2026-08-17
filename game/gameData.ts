export type StatName =
  | 'strength'
  | 'intelligence'
  | 'mindfulness'
  | 'endurance'
  | 'vitality';

export const CHARACTER_CLASS_NAMES = [
  'Warrior',
  'Scholar',
  'Monk',
  'Ranger',
] as const;

export type CharacterClassName = (typeof CHARACTER_CLASS_NAMES)[number];

type CharacterClassDefinition = {
  icon: string;
  description: string;
  color: string;
  focus: StatName;
};

export const CHARACTER_CLASSES: Record<
  CharacterClassName,
  CharacterClassDefinition
> = {
  Warrior: {
    icon: '⚔️',
    description: 'Strength, workouts & physical power',
    color: '#FF6B6B',
    focus: 'strength',
  },
  Scholar: {
    icon: '🧠',
    description: 'Learning, reading & intelligence',
    color: '#6C8CFF',
    focus: 'intelligence',
  },
  Monk: {
    icon: '🧘',
    description: 'Mindfulness, meditation & balance',
    color: '#B084FF',
    focus: 'mindfulness',
  },
  Ranger: {
    icon: '🏹',
    description: 'Steps, running & endurance',
    color: '#54D68A',
    focus: 'endurance',
  },
};

export type QuestDifficulty = 'Quick' | 'Core' | 'Challenge';

export type QuestDefinition = {
  id: string;
  icon: string;
  title: string;
  description: string;
  reward: number;
  stat: StatName;
  difficulty: QuestDifficulty;
};

export type QuestProgressionReward = {
  xp: number;
  statGain: number;
  alignmentBonus: number;
  consistencyBonus: number;
};

export const SHARED_QUESTS: readonly QuestDefinition[] = [
  {
    id: 'steps',
    icon: '👟',
    title: 'Walk 8,000 steps',
    description: 'Build a steady movement base throughout the day.',
    reward: 50,
    stat: 'endurance',
    difficulty: 'Core',
  },
  {
    id: 'workout',
    icon: '💪',
    title: 'Complete a workout',
    description: 'Finish any intentional training session.',
    reward: 100,
    stat: 'strength',
    difficulty: 'Core',
  },
  {
    id: 'reading',
    icon: '📖',
    title: 'Read for 20 minutes',
    description: 'Read something useful with notifications silenced.',
    reward: 50,
    stat: 'intelligence',
    difficulty: 'Quick',
  },
  {
    id: 'meditation',
    icon: '🧘',
    title: 'Meditate for 10 minutes',
    description: 'Sit quietly and return your attention to the breath.',
    reward: 50,
    stat: 'mindfulness',
    difficulty: 'Quick',
  },
  {
    id: 'sleep-goal',
    icon: '🌙',
    title: 'Reach your sleep goal',
    description: 'Log eight hours of restorative sleep or rest.',
    reward: 75,
    stat: 'vitality',
    difficulty: 'Core',
  },
  {
    id: 'hydration-goal',
    icon: '💧',
    title: 'Complete your hydration goal',
    description: 'Drink two liters of water across the day.',
    reward: 50,
    stat: 'vitality',
    difficulty: 'Quick',
  },
  {
    id: 'digital-balance',
    icon: '📵',
    title: 'Keep social media under 4 hours',
    description:
      'Review your phone habits honestly and confirm that social media stayed below your limit.',
    reward: 85,
    stat: 'mindfulness',
    difficulty: 'Core',
  },
] as const;

export const CLASS_QUESTS: Record<
  CharacterClassName,
  readonly QuestDefinition[]
> = {
  Warrior: [
    {
      id: 'warrior-pushups', icon: '🛡️', title: 'Complete 20 push-ups',
      description: 'Use a variation that keeps every repetition controlled.', reward: 45,
      stat: 'strength', difficulty: 'Quick',
    },
    {
      id: 'warrior-squats', icon: '⚔️', title: 'Finish 3 squat sets',
      description: 'Build strong legs with bodyweight or loaded squats.', reward: 70,
      stat: 'strength', difficulty: 'Core',
    },
    {
      id: 'warrior-strength', icon: '🏋️', title: 'Train strength for 30 minutes',
      description: 'Complete a balanced resistance-training session.', reward: 100,
      stat: 'strength', difficulty: 'Challenge',
    },
    {
      id: 'warrior-plank', icon: '🧱', title: 'Hold 2 minutes of planks',
      description: 'Accumulate the time across as many clean sets as needed.', reward: 50,
      stat: 'strength', difficulty: 'Quick',
    },
    {
      id: 'warrior-stairs', icon: '🪜', title: 'Climb 10 flights of stairs',
      description: 'Take a steady pace and build battle-ready conditioning.', reward: 65,
      stat: 'endurance', difficulty: 'Core',
    },
    {
      id: 'warrior-mobility', icon: '🤸', title: 'Do 10 minutes of mobility',
      description: 'Open the hips, shoulders, and ankles for better movement.', reward: 45,
      stat: 'endurance', difficulty: 'Quick',
    },
    {
      id: 'warrior-protein', icon: '🥗', title: 'Build a protein-rich meal',
      description: 'Choose a balanced meal that supports recovery.', reward: 45,
      stat: 'strength', difficulty: 'Quick',
    },
    {
      id: 'warrior-carry', icon: '🪨', title: 'Complete 5 loaded carries',
      description: 'Carry a safe load with tall posture for 30 seconds each.', reward: 75,
      stat: 'strength', difficulty: 'Core',
    },
    {
      id: 'warrior-form', icon: '🎯', title: 'Practice one lift technique',
      description: 'Use light resistance and refine ten precise repetitions.', reward: 55,
      stat: 'mindfulness', difficulty: 'Core',
    },
    {
      id: 'warrior-recovery', icon: '🌙', title: 'Complete a recovery ritual',
      description: 'Stretch, hydrate, and prepare for a full night of rest.', reward: 55,
      stat: 'mindfulness', difficulty: 'Core',
    },
  ],
  Scholar: [
    {
      id: 'scholar-pages', icon: '📚', title: 'Read 25 focused pages',
      description: 'Read actively and mark the ideas worth remembering.', reward: 60,
      stat: 'intelligence', difficulty: 'Core',
    },
    {
      id: 'scholar-deep-study', icon: '🔮', title: 'Study deeply for 45 minutes',
      description: 'Work on one subject with every distraction removed.', reward: 100,
      stat: 'intelligence', difficulty: 'Challenge',
    },
    {
      id: 'scholar-notes', icon: '📝', title: 'Summarize your notes',
      description: 'Condense what you learned into five useful points.', reward: 50,
      stat: 'intelligence', difficulty: 'Quick',
    },
    {
      id: 'scholar-recall', icon: '🃏', title: 'Complete a recall session',
      description: 'Review flashcards or retrieve ideas without looking.', reward: 55,
      stat: 'intelligence', difficulty: 'Quick',
    },
    {
      id: 'scholar-problems', icon: '🧩', title: 'Solve 5 difficult problems',
      description: 'Choose problems that require genuine reasoning.', reward: 80,
      stat: 'intelligence', difficulty: 'Core',
    },
    {
      id: 'scholar-teach', icon: '🗣️', title: 'Teach one concept aloud',
      description: 'Explain it simply enough for a beginner to follow.', reward: 65,
      stat: 'intelligence', difficulty: 'Core',
    },
    {
      id: 'scholar-vocabulary', icon: '🔤', title: 'Learn 10 new terms',
      description: 'Define each term and use it in context.', reward: 45,
      stat: 'intelligence', difficulty: 'Quick',
    },
    {
      id: 'scholar-curiosity', icon: '💡', title: 'Research one big question',
      description: 'Follow your curiosity and save three reliable findings.', reward: 70,
      stat: 'intelligence', difficulty: 'Core',
    },
    {
      id: 'scholar-focus', icon: '⏳', title: 'Finish a distraction-free sprint',
      description: 'Complete 25 minutes of uninterrupted focus.', reward: 55,
      stat: 'mindfulness', difficulty: 'Quick',
    },
    {
      id: 'scholar-plan', icon: '🗺️', title: 'Plan tomorrow’s learning',
      description: 'Choose the next topic and define a clear finish line.', reward: 45,
      stat: 'mindfulness', difficulty: 'Quick',
    },
  ],
  Monk: [
    {
      id: 'monk-breath', icon: '🌬️', title: 'Practice 5 minutes of breathing',
      description: 'Slow the breath and lengthen each exhale.', reward: 40,
      stat: 'mindfulness', difficulty: 'Quick',
    },
    {
      id: 'monk-stillness', icon: '🪷', title: 'Sit in stillness for 20 minutes',
      description: 'Notice thoughts without needing to follow them.', reward: 75,
      stat: 'mindfulness', difficulty: 'Core',
    },
    {
      id: 'monk-gratitude', icon: '🙏', title: 'Write 3 points of gratitude',
      description: 'Be specific about what made each one meaningful.', reward: 40,
      stat: 'mindfulness', difficulty: 'Quick',
    },
    {
      id: 'monk-yoga', icon: '☯️', title: 'Complete a 20-minute flow',
      description: 'Move slowly and connect each position to the breath.', reward: 70,
      stat: 'mindfulness', difficulty: 'Core',
    },
    {
      id: 'monk-walk', icon: '🍃', title: 'Take a silent mindful walk',
      description: 'Walk for 15 minutes without audio or notifications.', reward: 60,
      stat: 'endurance', difficulty: 'Core',
    },
    {
      id: 'monk-meal', icon: '🍵', title: 'Eat one meal without a screen',
      description: 'Slow down and pay attention to every bite.', reward: 45,
      stat: 'mindfulness', difficulty: 'Quick',
    },
    {
      id: 'monk-journal', icon: '📓', title: 'Complete a mindful check-in',
      description: 'Name what you feel, need, and intend to do next.', reward: 50,
      stat: 'mindfulness', difficulty: 'Quick',
    },
    {
      id: 'monk-screen-free', icon: '📵', title: 'Go screen-free for one hour',
      description: 'Create quiet space for reflection or connection.', reward: 80,
      stat: 'mindfulness', difficulty: 'Core',
    },
    {
      id: 'monk-kindness', icon: '🤝', title: 'Perform one quiet kindness',
      description: 'Help someone without expecting recognition.', reward: 55,
      stat: 'mindfulness', difficulty: 'Core',
    },
    {
      id: 'monk-retreat', icon: '⛰️', title: 'Complete a 30-minute meditation',
      description: 'Stay with one practice for the full session.', reward: 110,
      stat: 'mindfulness', difficulty: 'Challenge',
    },
  ],
  Ranger: [
    {
      id: 'ranger-steps', icon: '🥾', title: 'Reach 12,000 steps',
      description: 'Travel farther than your normal daily route.', reward: 100,
      stat: 'endurance', difficulty: 'Challenge',
    },
    {
      id: 'ranger-run', icon: '🏃', title: 'Run or jog for 20 minutes',
      description: 'Keep a sustainable pace you can hold with control.', reward: 75,
      stat: 'endurance', difficulty: 'Core',
    },
    {
      id: 'ranger-outdoors', icon: '🌲', title: 'Spend 30 minutes outdoors',
      description: 'Get moving outside and notice the terrain around you.', reward: 55,
      stat: 'endurance', difficulty: 'Quick',
    },
    {
      id: 'ranger-route', icon: '🧭', title: 'Explore a new route',
      description: 'Walk, run, or ride somewhere you have not tried before.', reward: 65,
      stat: 'endurance', difficulty: 'Core',
    },
    {
      id: 'ranger-intervals', icon: '⚡', title: 'Complete 6 speed intervals',
      description: 'Alternate brief faster efforts with full recovery.', reward: 90,
      stat: 'endurance', difficulty: 'Challenge',
    },
    {
      id: 'ranger-hills', icon: '⛰️', title: 'Climb hills for 15 minutes',
      description: 'Find an incline and keep a steady, confident rhythm.', reward: 75,
      stat: 'endurance', difficulty: 'Core',
    },
    {
      id: 'ranger-mobility', icon: '🦵', title: 'Mobilize hips and ankles',
      description: 'Spend ten minutes preparing your stride and joints.', reward: 45,
      stat: 'endurance', difficulty: 'Quick',
    },
    {
      id: 'ranger-hydrate', icon: '💧', title: 'Fill and finish your water bottle',
      description: 'Bring water on your route and drink consistently.', reward: 40,
      stat: 'mindfulness', difficulty: 'Quick',
    },
    {
      id: 'ranger-active-trip', icon: '🚲', title: 'Make one trip actively',
      description: 'Walk or cycle for an errand when practical.', reward: 60,
      stat: 'endurance', difficulty: 'Core',
    },
    {
      id: 'ranger-scout', icon: '👀', title: 'Spot 5 details in nature',
      description: 'Pause outdoors and record five things you notice.', reward: 45,
      stat: 'mindfulness', difficulty: 'Quick',
    },
  ],
};

export const QUESTS: readonly QuestDefinition[] = [
  ...SHARED_QUESTS,
  ...CLASS_QUESTS.Warrior,
  ...CLASS_QUESTS.Scholar,
  ...CLASS_QUESTS.Monk,
  ...CLASS_QUESTS.Ranger,
];

export const DAILY_QUEST_SET_COUNT = 10;
export const DAILY_QUEST_RESET_HOUR = 12;
export const DAILY_CLASS_QUEST_COUNT = 8;
export const DAILY_SHARED_QUEST_COUNT = 4;
export const DAILY_QUEST_COUNT =
  DAILY_CLASS_QUEST_COUNT + DAILY_SHARED_QUEST_COUNT;

export type DailyQuestSet = {
  cycleKey: string;
  index: number;
  classQuests: readonly QuestDefinition[];
  sharedQuests: readonly QuestDefinition[];
  quests: readonly QuestDefinition[];
};

export function getQuestCycleKey(date = new Date()) {
  const shifted = new Date(date);
  shifted.setHours(shifted.getHours() - DAILY_QUEST_RESET_HOUR);
  const year = shifted.getFullYear();
  const month = String(shifted.getMonth() + 1).padStart(2, '0');
  const day = String(shifted.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getPreviousQuestCycleKey(date = new Date()) {
  const previousCycle = new Date(date);
  previousCycle.setDate(previousCycle.getDate() - 1);
  return getQuestCycleKey(previousCycle);
}

export function getQuestWeekKey(date = new Date()) {
  const shifted = new Date(date);
  shifted.setHours(shifted.getHours() - DAILY_QUEST_RESET_HOUR);
  const day = shifted.getDay();
  const daysSinceMonday = (day + 6) % 7;
  shifted.setDate(shifted.getDate() - daysSinceMonday);
  const year = shifted.getFullYear();
  const month = String(shifted.getMonth() + 1).padStart(2, '0');
  const monthDay = String(shifted.getDate()).padStart(2, '0');
  return `${year}-${month}-${monthDay}`;
}

export function getDailyQuestSet(
  characterClass: CharacterClassName,
  date = new Date(),
): DailyQuestSet {
  const cycleKey = getQuestCycleKey(date);
  const [year, month, day] = cycleKey.split('-').map(Number);
  const cycleNumber = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  const index = positiveModulo(cycleNumber, DAILY_QUEST_SET_COUNT);
  const classOffset = CHARACTER_CLASS_NAMES.indexOf(characterClass);
  const classQuests = rotateTake(
    CLASS_QUESTS[characterClass],
    index * 3,
    DAILY_CLASS_QUEST_COUNT,
  );
  const sharedQuests = rotateTake(
    SHARED_QUESTS,
    index * 2 + classOffset,
    DAILY_SHARED_QUEST_COUNT,
  );
  return {
    cycleKey,
    index,
    classQuests,
    sharedQuests,
    quests: [...classQuests, ...sharedQuests],
  };
}

export function getDailyQuests(
  characterClass: CharacterClassName,
  date = new Date(),
) {
  return getDailyQuestSet(characterClass, date).quests;
}

function rotateTake<T>(items: readonly T[], start: number, count: number) {
  return Array.from(
    { length: Math.min(count, items.length) },
    (_, index) => items[positiveModulo(start + index, items.length)],
  );
}

function positiveModulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

export type QuestId = QuestDefinition['id'];

export function getLevelProgress(totalXp: number) {
  const safeXp = Math.max(0, Math.floor(totalXp));
  let level = 1;
  let levelStartXp = 0;
  let xpForNextLevel = getXpRequirement(level);

  while (safeXp >= levelStartXp + xpForNextLevel) {
    levelStartXp += xpForNextLevel;
    level += 1;
    xpForNextLevel = getXpRequirement(level);
  }

  const currentXp = safeXp - levelStartXp;

  return {
    level,
    currentXp,
    xpForNextLevel,
    levelStartXp,
    nextLevelXp: levelStartXp + xpForNextLevel,
    progressPercent: `${(currentXp / xpForNextLevel) * 100}%` as `${number}%`,
  };
}

export function getXpRequirement(level: number) {
  const completedLevels = Math.max(0, level - 1);
  const milestoneBands = Math.floor(completedLevels / 5);
  return 350 + completedLevels * 125 + milestoneBands * 75;
}

export function getQuestStatGain(difficulty: QuestDifficulty) {
  return difficulty === 'Challenge' ? 3 : difficulty === 'Core' ? 2 : 1;
}

export function getQuestProgressionReward(
  quest: QuestDefinition,
  characterClass: CharacterClassName,
  questStreak: number,
): QuestProgressionReward {
  const aligned = quest.stat === CHARACTER_CLASSES[characterClass].focus;
  const alignmentBonus = aligned ? Math.round(quest.reward * 0.15) : 0;
  const streakPercent = Math.min(0.15, Math.max(0, questStreak - 1) * 0.03);
  const consistencyBonus = Math.round(quest.reward * streakPercent);
  const rawXp = quest.reward + alignmentBonus + consistencyBonus;

  return {
    xp: Math.max(5, Math.round(rawXp / 5) * 5),
    statGain: getQuestStatGain(quest.difficulty),
    alignmentBonus,
    consistencyBonus,
  };
}

export function getAttributeRank(value: number) {
  if (value >= 100) return { name: 'Transcendent', floor: 100, ceiling: 125 };
  if (value >= 75) return { name: 'Ascendant', floor: 75, ceiling: 100 };
  if (value >= 50) return { name: 'Mythic', floor: 50, ceiling: 75 };
  if (value >= 40) return { name: 'Master', floor: 40, ceiling: 50 };
  if (value >= 30) return { name: 'Elite', floor: 30, ceiling: 40 };
  if (value >= 20) return { name: 'Adept', floor: 20, ceiling: 30 };
  if (value >= 10) return { name: 'Trained', floor: 10, ceiling: 20 };
  return { name: 'Awakening', floor: 0, ceiling: 10 };
}

export function getEffectiveAttributePower(value: number) {
  const safeValue = Math.max(0, value);
  if (safeValue <= 20) return safeValue;
  if (safeValue <= 50) return 20 + (safeValue - 20) * 0.5;
  return 35 + (safeValue - 50) * 0.25;
}

export function getBaseStats(characterClass: CharacterClassName) {
  const classStats: Record<CharacterClassName, Record<StatName, number>> = {
    Warrior: {
      strength: 5,
      endurance: 2,
      intelligence: 1,
      mindfulness: 1,
      vitality: 2,
    },
    Scholar: {
      strength: 1,
      endurance: 1,
      intelligence: 5,
      mindfulness: 2,
      vitality: 2,
    },
    Monk: {
      strength: 1,
      endurance: 2,
      intelligence: 2,
      mindfulness: 5,
      vitality: 3,
    },
    Ranger: {
      strength: 2,
      endurance: 5,
      intelligence: 1,
      mindfulness: 2,
      vitality: 3,
    },
  };

  return classStats[characterClass];
}
