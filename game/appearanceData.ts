import { ImageSourcePropType } from 'react-native';

import { CharacterClassName } from './gameData';

export const APPEARANCE_IDS = ['violet', 'ember', 'frost'] as const;

export type AppearanceId = (typeof APPEARANCE_IDS)[number];

export const EYE_STYLES = ['round', 'focused', 'soft'] as const;
export const NOSE_STYLES = ['small', 'straight', 'wide'] as const;
export const HAIR_STYLES = ['short', 'swept', 'tied', 'curls'] as const;
export const HAIR_COLORS = ['midnight', 'brown', 'blonde', 'crimson', 'silver'] as const;
export const SKIN_TONES = ['porcelain', 'light', 'medium', 'deep', 'ebony'] as const;

export type EyeStyle = (typeof EYE_STYLES)[number];
export type NoseStyle = (typeof NOSE_STYLES)[number];
export type HairStyle = (typeof HAIR_STYLES)[number];
export type HairColor = (typeof HAIR_COLORS)[number];
export type SkinTone = (typeof SKIN_TONES)[number];

export type AvatarCustomization = {
  eyeStyle: EyeStyle;
  noseStyle: NoseStyle;
  hairStyle: HairStyle;
  hairColor: HairColor;
  skinTone: SkinTone;
};

export const DEFAULT_AVATAR_CUSTOMIZATION: AvatarCustomization = {
  eyeStyle: 'focused',
  noseStyle: 'straight',
  hairStyle: 'short',
  hairColor: 'midnight',
  skinTone: 'medium',
};

export const HAIR_COLOR_VALUES: Record<HairColor, string> = {
  midnight: '#17192B',
  brown: '#65422F',
  blonde: '#D7B46A',
  crimson: '#8E3447',
  silver: '#C8CDDA',
};

export const SKIN_TONE_VALUES: Record<SkinTone, string> = {
  porcelain: '#F6D8C8',
  light: '#E8BFA7',
  medium: '#C98E69',
  deep: '#8C5A43',
  ebony: '#54372F',
};

export const AVATAR_OPTION_LABELS = {
  eyeStyle: { round: 'Round', focused: 'Focused', soft: 'Soft' },
  noseStyle: { small: 'Small', straight: 'Straight', wide: 'Wide' },
  hairStyle: { short: 'Short', swept: 'Swept', tied: 'Tied', curls: 'Curls' },
  hairColor: { midnight: 'Midnight', brown: 'Brown', blonde: 'Blonde', crimson: 'Crimson', silver: 'Silver' },
  skinTone: { porcelain: 'Porcelain', light: 'Light', medium: 'Medium', deep: 'Deep', ebony: 'Ebony' },
} as const;

type AppearanceDefinition = {
  name: string;
  description: string;
  accent: string;
};

export type AvatarEvolution = {
  stage: number;
  name: string;
  title: string;
  minimumLevel: number;
  nextLevel: number | null;
  scale: number;
  widthScale: number;
  auraStrength: number;
};

const EVOLUTION_LEVELS = [1, 3, 6, 10, 15, 20] as const;

const EVOLUTION_NAMES: Record<CharacterClassName, readonly string[]> = {
  Warrior: ['Iron Initiate', 'Forged Fighter', 'Vanguard', 'War Champion', 'Titanborn', 'Worldbreaker'],
  Scholar: ['Archive Initiate', 'Runebinder', 'Spellwright', 'Grand Savant', 'Chronarch', 'Event Sage'],
  Monk: ['Quiet Initiate', 'Flow Disciple', 'Lotus Adept', 'Temple Master', 'Jade Sage', 'Dragon Soul'],
  Ranger: ['Trail Initiate', 'Pathfinder', 'Wild Warden', 'Storm Scout', 'Star Hunter', 'Horizon Keeper'],
};

const EVOLUTION_TITLES: Record<CharacterClassName, readonly string[]> = {
  Warrior: ['Power begins', 'Frame strengthened', 'Battle frame awakened', 'Champion physique', 'Titan physique', 'Peak physical form'],
  Scholar: ['Mind awakened', 'Runes awakened', 'Arcane field expanded', 'Knowledge made power', 'Time bends nearby', 'Living constellation'],
  Monk: ['Breath awakened', 'Flow made visible', 'Aura strengthened', 'Perfect balance', 'Spirit made radiant', 'Body and spirit unified'],
  Ranger: ['Trail sense awakened', 'Stride sharpened', 'Warden presence', 'Storm-speed stance', 'Hunter aura awakened', 'One with the horizon'],
};

export function getAvatarEvolution(
  characterClass: CharacterClassName,
  level: number,
): AvatarEvolution {
  const safeLevel = Math.max(1, Math.floor(level));
  let stage = 0;
  EVOLUTION_LEVELS.forEach((minimumLevel, index) => {
    if (safeLevel >= minimumLevel) stage = index;
  });

  const warriorWidthGrowth = characterClass === 'Warrior' ? stage * 0.028 : 0;
  const rangerWidthGrowth = characterClass === 'Ranger' ? stage * 0.008 : 0;

  return {
    stage,
    name: EVOLUTION_NAMES[characterClass][stage],
    title: EVOLUTION_TITLES[characterClass][stage],
    minimumLevel: EVOLUTION_LEVELS[stage],
    nextLevel: EVOLUTION_LEVELS[stage + 1] ?? null,
    scale: 1 + stage * 0.012,
    widthScale: 1 + warriorWidthGrowth + rangerWidthGrowth,
    auraStrength: 1 + stage * 0.18,
  };
}

export const CLASS_SPRITES: Record<
  CharacterClassName,
  ImageSourcePropType
> = {
  Warrior: require('../assets/sprites/hero-violet.png'),
  Scholar: require('../assets/sprites/hero-scholar.png'),
  Monk: require('../assets/sprites/hero-monk.png'),
  Ranger: require('../assets/sprites/hero-ranger.png'),
};

export const APPEARANCES: Record<AppearanceId, AppearanceDefinition> = {
  violet: {
    name: 'Astral',
    description: 'Violet ascendant aura',
    accent: '#8B7CFF',
  },
  ember: {
    name: 'Ember',
    description: 'Crimson power aura',
    accent: '#FF655F',
  },
  frost: {
    name: 'Frost',
    description: 'Glacial focus aura',
    accent: '#65C7FF',
  },
};
