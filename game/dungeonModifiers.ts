import type { DungeonId } from './dungeonData';
import { DUNGEONS } from './dungeonData';
import { getQuestCycleKey } from './gameData';

export type DungeonAffix = {
  id: 'relentless' | 'warded' | 'volatile' | 'draining' | 'balanced';
  name: string;
  description: string;
  icon: string;
  hpMultiplier: number;
  attackMultiplier: number;
  rewardMultiplier: number;
  accent: string;
};

export type DungeonBoon = {
  id: 'fury' | 'aegis' | 'renewal';
  name: string;
  description: string;
  icon: string;
  damageBonus: number;
  guardBonus: number;
  healPercent: number;
};

export const DUNGEON_AFFIXES: readonly DungeonAffix[] = [
  {
    id: 'balanced',
    name: 'Trial of Balance',
    description: 'No advantage. Win through clean execution and resource control.',
    icon: 'skill-geometry',
    hpMultiplier: 1,
    attackMultiplier: 1,
    rewardMultiplier: 1,
    accent: '#8B96B3',
  },
  {
    id: 'relentless',
    name: 'Relentless Foes',
    description: 'Enemies strike 18% harder. Guard and BREAK become essential.',
    icon: 'combat-impact',
    hpMultiplier: 1,
    attackMultiplier: 1.18,
    rewardMultiplier: 1.12,
    accent: '#FF766D',
  },
  {
    id: 'warded',
    name: 'Warded Legion',
    description: 'Enemies have 22% more health, rewarding sustained builds.',
    icon: 'combat-shield',
    hpMultiplier: 1.22,
    attackMultiplier: 1,
    rewardMultiplier: 1.12,
    accent: '#69C9FF',
  },
  {
    id: 'volatile',
    name: 'Volatile Depths',
    description: 'Enemies gain 12% health and damage. Rewards are significantly increased.',
    icon: 'combat-fire',
    hpMultiplier: 1.12,
    attackMultiplier: 1.12,
    rewardMultiplier: 1.2,
    accent: '#FFB25E',
  },
  {
    id: 'draining',
    name: 'Starved Aether',
    description: 'Boss pressure rises by 8%. Preserve energy between encounters.',
    icon: 'resource-energy',
    hpMultiplier: 1.08,
    attackMultiplier: 1.08,
    rewardMultiplier: 1.1,
    accent: '#B286FF',
  },
];

export const DUNGEON_BOONS: readonly DungeonBoon[] = [
  {
    id: 'fury',
    name: 'Rune of Fury',
    description: '+8% damage for the rest of this run',
    icon: 'combat-impact',
    damageBonus: 0.08,
    guardBonus: 0,
    healPercent: 0,
  },
  {
    id: 'aegis',
    name: 'Aegis Seal',
    description: '+8% guard for the rest of this run',
    icon: 'combat-aegis',
    damageBonus: 0,
    guardBonus: 0.08,
    healPercent: 0,
  },
  {
    id: 'renewal',
    name: 'Renewal Spring',
    description: 'Immediately restore 18% maximum HP',
    icon: 'resource-healing',
    damageBonus: 0,
    guardBonus: 0,
    healPercent: 0.18,
  },
];

export function getDungeonAffix(id: DungeonId, date = new Date()) {
  const cycleKey = getQuestCycleKey(date);
  const [year, month, day] = cycleKey.split('-').map(Number);
  const cycle = Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
  const dungeonOffset = Math.max(
    0,
    DUNGEONS.findIndex((dungeon) => dungeon.id === id),
  );
  return DUNGEON_AFFIXES[(cycle + dungeonOffset) % DUNGEON_AFFIXES.length];
}
