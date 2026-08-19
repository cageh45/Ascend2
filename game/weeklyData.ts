import type { CharacterClassName } from './gameData';

export const WEEKLY_QUEST_TARGET = 20;

type WeeklyArc = {
  title: string;
  objective: string;
};

const WEEKLY_ARCS: Record<CharacterClassName, readonly WeeklyArc[]> = {
  Warrior: [
    { title: 'Forge the Foundation', objective: 'Build strength through steady, repeatable effort.' },
    { title: 'Unbroken Vanguard', objective: 'Balance hard sessions with deliberate recovery.' },
    { title: 'Titan’s Resolve', objective: 'Show up consistently and finish the week stronger.' },
  ],
  Scholar: [
    { title: 'The Focus Protocol', objective: 'Train attention, movement, and restoration as one system.' },
    { title: 'Mind Over Momentum', objective: 'Turn intentional routines into lasting clarity.' },
    { title: 'Chronicle of Growth', objective: 'Study your habits and build a wiser week.' },
  ],
  Monk: [
    { title: 'Seven Days of Flow', objective: 'Link mindful movement, breath, and recovery.' },
    { title: 'The Quiet Ascent', objective: 'Practice consistency without chasing perfection.' },
    { title: 'Lotus Discipline', objective: 'Strengthen body and mind through balanced rituals.' },
  ],
  Ranger: [
    { title: 'Trail of Momentum', objective: 'Explore varied movement and keep your rhythm alive.' },
    { title: 'The Long Horizon', objective: 'Build endurance one purposeful outing at a time.' },
    { title: 'Wild Pathfinding', objective: 'Mix movement, recovery, and outdoor awareness.' },
  ],
};

export function getWeeklyArc(
  characterClass: CharacterClassName,
  weekKey: string,
) {
  const arcs = WEEKLY_ARCS[characterClass];
  const seed = [...weekKey].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return arcs[seed % arcs.length];
}
