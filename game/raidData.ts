import { ImageSourcePropType } from 'react-native';

export type RaidBossId =
  | 'iron-wyrm'
  | 'void-titan'
  | 'thorn-empress'
  | 'storm-leviathan'
  | 'ash-colossus'
  | 'moonfang';

export type RaidBoss = {
  id: RaidBossId;
  name: string;
  title: string;
  level: number;
  maxHp: number;
  attackMin: number;
  attackMax: number;
  rewardXp: number;
  accent: string;
  description: string;
  source: ImageSourcePropType;
};

export const RAID_BOSSES: readonly RaidBoss[] = [
  {
    id: 'iron-wyrm',
    name: 'Iron Wyrm',
    title: 'The Forge Tyrant',
    level: 2,
    maxHp: 2600,
    attackMin: 55,
    attackMax: 75,
    rewardXp: 500,
    accent: '#FF704D',
    description: 'A plated dragon that grows hotter with every strike.',
    source: require('../assets/sprites/iron-wyrm.png'),
  },
  {
    id: 'thorn-empress',
    name: 'Thorn Empress',
    title: 'Queen of the Wild',
    level: 5,
    maxHp: 4200,
    attackMin: 75,
    attackMax: 100,
    rewardXp: 560,
    accent: '#78D66D',
    description: 'Ancient roots answer every command of the wild queen.',
    source: require('../assets/sprites/boss-thorn-empress.png'),
  },
  {
    id: 'storm-leviathan',
    name: 'Storm Leviathan',
    title: 'The Skybreaker',
    level: 8,
    maxHp: 6000,
    attackMin: 95,
    attackMax: 125,
    rewardXp: 620,
    accent: '#4CCBFF',
    description: 'A living tempest coiled around a heart of lightning.',
    source: require('../assets/sprites/boss-storm-leviathan.png'),
  },
  {
    id: 'ash-colossus',
    name: 'Ash Colossus',
    title: 'Heart of the Caldera',
    level: 11,
    maxHp: 7800,
    attackMin: 115,
    attackMax: 150,
    rewardXp: 700,
    accent: '#FF8A3D',
    description: 'A mountain given fists, fury, and a molten core.',
    source: require('../assets/sprites/boss-ash-colossus.png'),
  },
  {
    id: 'moonfang',
    name: 'Moonfang',
    title: 'Lunar Guardian',
    level: 14,
    maxHp: 9800,
    attackMin: 135,
    attackMax: 175,
    rewardXp: 780,
    accent: '#A9D8FF',
    description: 'The moonlit sentinel hunts any party that shows fear.',
    source: require('../assets/sprites/boss-moonfang.png'),
  },
  {
    id: 'void-titan',
    name: 'Void Titan',
    title: 'End of the Ascent',
    level: 18,
    maxHp: 12500,
    attackMin: 160,
    attackMax: 210,
    rewardXp: 900,
    accent: '#A875FF',
    description: 'An obsidian war-god powered by a collapsing star.',
    source: require('../assets/sprites/boss-void-titan.png'),
  },
];

export const RAID_BOSS_IDS = RAID_BOSSES.map((boss) => boss.id);

export function getRaidBoss(id: RaidBossId) {
  return RAID_BOSSES.find((boss) => boss.id === id) ?? RAID_BOSSES[0];
}
