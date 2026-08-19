import type { QuestDefinition } from './gameData';

export type QuestActivity =
  | {
      type: 'timer';
      durationSeconds: number;
      instruction: string;
    }
  | {
      type: 'counter';
      target: number;
      step: number;
      unit: string;
      instruction: string;
    }
  | {
      type: 'journal';
      prompt: string;
      placeholder: string;
      minimumCharacters?: number;
    }
  | {
      type: 'limitJournal';
      recommendedMinutes: number;
      stepMinutes: number;
      instruction: string;
      prompt: string;
      placeholder: string;
      minimumCharacters?: number;
    }
  | {
      type: 'checklist';
      instruction: string;
      items: readonly string[];
    };

type TimerQuestActivity = Extract<QuestActivity, { type: 'timer' }>;

const activities: Record<string, QuestActivity> = {
  steps: counter(8000, 'steps', 'Estimate or check your own step counter, then log progress in 1,000-step milestones.', 1000),
  workout: checklist('Complete and confirm an intentional workout.', [
    'Warm up safely',
    'Complete the planned workout',
    'Cool down and recover',
  ]),
  reading: timer(20, 'Settle in with one useful book or article. The timer keeps running if you leave this screen.'),
  meditation: timer(10, 'Sit comfortably. Follow the breath, and gently return whenever your attention wanders.'),
  'sleep-goal': checklist('Confirm the habits that supported a restorative night.', [
    'Allowed enough time for eight hours of rest',
    'Put distractions away before sleep',
    'Completed the morning sleep check-in',
  ]),
  'hydration-goal': counter(8, 'glasses', 'Log eight approximately 250 mL glasses to reach two liters.'),
  'digital-balance': {
    type: 'limitJournal',
    recommendedMinutes: 240,
    stepMinutes: 15,
    instruction: 'Check today’s social-media usage in phone settings, then record it honestly.',
    prompt: 'You went over today. What contributed to the extra time, and what will you try tomorrow?',
    placeholder: 'I went over because…\n\nTomorrow I will…',
    minimumCharacters: 8,
  },
  'morning-light': timer(10, 'Step outside during daylight and let your eyes adjust naturally. Do not look directly at the sun.'),
  'balanced-meal': checklist('Build and enjoy one balanced meal.', [
    'Include a protein source',
    'Add fruit or vegetables',
    'Add a satisfying source of energy',
  ]),
  'tidy-space': timer(10, 'Choose one small physical or digital space and reset only that area.'),
  'meaningful-connection': journal(
    'Who did you connect with, and what made the conversation meaningful?',
    'I connected with…\n\nIt mattered because…',
  ),
  'three-priorities': journal(
    'What are the three realistic outcomes that matter most today?',
    '1.\n2.\n3.',
  ),
  'stretch-break': timer(8, 'Step away from sitting and gently move your neck, shoulders, hips, and ankles.'),

  'warrior-pushups': counter(20, 'reps', 'Count only controlled repetitions. Use an incline or knee variation when needed.'),
  'warrior-squats': counter(3, 'sets', 'Complete one safe set at a time, then log it after your rest.'),
  'warrior-strength': timer(30, 'Complete a balanced resistance-training session. Pause whenever you need a longer recovery break.'),
  'warrior-plank': timer(2, 'Accumulate two minutes with a braced core. Pause the timer whenever your form breaks.'),
  'warrior-stairs': counter(10, 'flights', 'Log each flight after climbing it at a safe, steady pace.'),
  'warrior-mobility': timer(10, 'Move through the hips, shoulders, and ankles without forcing your range.'),
  'warrior-protein': checklist('Build a balanced recovery meal.', [
    'Add a protein source',
    'Add fruit or vegetables',
    'Drink water with the meal',
  ]),
  'warrior-carry': counter(5, 'carries', 'Log each 30-second carry. Choose a load you can control with tall posture.'),
  'warrior-form': counter(10, 'reps', 'Use light resistance and count ten technically precise repetitions.'),
  'warrior-recovery': checklist('Complete each part of your recovery ritual.', [
    'Gentle stretch or mobility',
    'Rehydrate',
    'Prepare a calm sleep routine',
  ]),
  'warrior-lunges': counter(20, 'reps', 'Alternate legs and count only controlled repetitions. Hold a stable support if needed.'),
  'warrior-pull': counter(3, 'sets', 'Use rows, resistance bands, or another safe pulling movement with controlled form.'),
  'warrior-press': counter(3, 'sets', 'Choose a pressing variation you can perform with stable, controlled form.'),

  'scholar-pages': counter(25, 'pages', 'Log focused pages as you finish them, not pages you skim.'),
  'scholar-deep-study': timer(45, 'Choose one subject and remove distractions before beginning.'),
  'scholar-notes': journal(
    'What are the five ideas most worth remembering?',
    '1.\n2.\n3.\n4.\n5.',
  ),
  'scholar-recall': timer(10, 'Retrieve ideas without looking at the answer. Check your work after the sprint.'),
  'scholar-problems': counter(5, 'problems', 'Count a problem after you have attempted and checked your reasoning.'),
  'scholar-teach': timer(3, 'Explain one concept aloud in plain language, as if teaching a beginner.'),
  'scholar-vocabulary': counter(10, 'terms', 'Define each new term and use it once in context.'),
  'scholar-curiosity': journal(
    'What question did you explore, and what three reliable findings did you uncover?',
    'My question…\n\n1. Finding…\n2. Finding…\n3. Finding…',
  ),
  'scholar-focus': timer(25, 'Work on one clearly defined outcome until the focus sprint ends.'),
  'scholar-plan': journal(
    'What will you learn tomorrow, and what does “finished” look like?',
    'Tomorrow I will…\n\nI am finished when…',
  ),
  'scholar-mind-map': journal(
    'Place one idea at the center, then connect at least six related details.',
    'Central idea…\n\n1.\n2.\n3.\n4.\n5.\n6.',
  ),
  'scholar-language': timer(15, 'Choose one focused language activity and stay with it for the full session.'),
  'scholar-organize': checklist('Prepare one focused study space.', [
    'Clear unrelated clutter',
    'Organize the materials you need',
    'Define the next study task',
  ]),

  'monk-breath': timer(5, 'Breathe slowly and let each exhale become a little longer than the inhale.'),
  'monk-stillness': timer(20, 'Notice thoughts and sensations without needing to follow or change them.'),
  'monk-gratitude': journal(
    'Write three specific things you appreciate and why each mattered.',
    '1. I appreciate… because…\n2. I appreciate… because…\n3. I appreciate… because…',
  ),
  'monk-yoga': timer(20, 'Move slowly through a comfortable flow and connect each position to the breath.'),
  'monk-walk': timer(15, 'Walk without audio. Feel each step and notice the world around you.'),
  'monk-meal': timer(15, 'Put the screen away and bring your full attention to the meal.'),
  'monk-journal': journal(
    'What are you feeling, what do you need, and what gentle next step will you take?',
    'Right now I feel…\n\nI need…\n\nMy next step is…',
  ),
  'monk-screen-free': timer(60, 'Leave your phone behind and make room for reflection or connection.'),
  'monk-kindness': journal(
    'What quiet act of kindness did you complete?',
    'I helped by…',
  ),
  'monk-retreat': timer(30, 'Stay with one meditation practice for the full session.'),
  'monk-body-scan': timer(10, 'Move attention slowly from head to toe and notice sensation without trying to change it.'),
  'monk-declutter': timer(10, 'Quietly organize one small physical or digital space, then stop when the timer ends.'),
  'monk-five-senses': checklist('Ground your attention in the present moment.', [
    'Notice what you can see and hear',
    'Notice touch, temperature, and movement',
    'Notice scent and taste without judgment',
  ]),

  'ranger-steps': counter(12000, 'steps', 'Estimate or check your own step counter, then log progress in 1,000-step milestones.', 1000),
  'ranger-run': timer(20, 'Run or jog at a sustainable pace. Pause the timer if you stop for more than a brief crossing.'),
  'ranger-outdoors': timer(30, 'Spend this session moving outside and observing the terrain around you.'),
  'ranger-route': journal(
    'Where did your new route take you, and what made it different?',
    'I explored…\n\nI noticed…',
  ),
  'ranger-intervals': counter(6, 'intervals', 'Log each faster effort after completing its recovery period.'),
  'ranger-hills': timer(15, 'Use a sustainable rhythm on an incline and stay aware of your footing.'),
  'ranger-mobility': timer(10, 'Prepare your hips, ankles, and calves with comfortable movement.'),
  'ranger-hydrate': counter(1, 'bottle', 'Finish the bottle you brought for today’s route.'),
  'ranger-active-trip': timer(20, 'Walk or cycle for an errand or destination instead of taking a passive trip.'),
  'ranger-scout': journal(
    'Record five details you noticed outdoors.',
    '1.\n2.\n3.\n4.\n5.',
  ),
  'ranger-balance': timer(5, 'Practice both sides near a stable support. Stop if you feel pain or dizziness.'),
  'ranger-brisk-walk': timer(25, 'Walk at a purposeful pace that still allows comfortable, controlled breathing.'),
  'ranger-stairs': timer(10, 'Use a safe staircase at a controlled pace. Pause whenever you need recovery.'),
};

export function getQuestActivity(
  quest: QuestDefinition,
): QuestActivity | undefined {
  return activities[quest.id];
}

function timer(minutes: number, instruction: string): TimerQuestActivity {
  return { type: 'timer', durationSeconds: minutes * 60, instruction };
}

function counter(
  target: number,
  unit: string,
  instruction: string,
  step = 1,
): QuestActivity {
  return { type: 'counter', target, step, unit, instruction };
}

function journal(
  prompt: string,
  placeholder: string,
): QuestActivity {
  return {
    type: 'journal',
    prompt,
    placeholder,
    minimumCharacters: 8,
  };
}

function checklist(
  instruction: string,
  items: readonly string[],
): QuestActivity {
  return { type: 'checklist', instruction, items };
}
