import { ImageSourcePropType } from 'react-native';

import { CharacterClassName } from './gameData';

export type GearSetId =
  | 'warrior-nightguard'
  | 'warrior-dawnforged'
  | 'warrior-voidbreaker'
  | 'scholar-archive'
  | 'scholar-stormcall'
  | 'scholar-chronarch'
  | 'monk-lotus'
  | 'monk-crimson-tempest'
  | 'monk-jade-dragon'
  | 'ranger-wayfinder'
  | 'ranger-frostwind'
  | 'ranger-starfall';

export type GearRarity = 'Starter' | 'Rare' | 'Legendary';

export type GearSetDefinition = {
  id: GearSetId;
  characterClass: CharacterClassName;
  name: string;
  armorName: string;
  weaponName: string;
  rarity: GearRarity;
  unlockLevel: number;
  description: string;
  bonusText: string;
  damageBonus: number;
  maxHpBonus: number;
  accent: string;
  source: ImageSourcePropType;
};

export const GEAR_SETS: Record<
  CharacterClassName,
  readonly GearSetDefinition[]
> = {
  Warrior: [
    {
      id: 'warrior-nightguard',
      characterClass: 'Warrior',
      name: 'Nightguard Set',
      armorName: 'Nightguard Plate',
      weaponName: 'Violet Oathblade',
      rarity: 'Starter',
      unlockLevel: 1,
      description: 'Balanced armor forged for a newly awakened Warrior.',
      bonusText: '+40 HP · +2% raid damage',
      damageBonus: 0.02,
      maxHpBonus: 40,
      accent: '#8B7CFF',
      source: require('../assets/sprites/hero-violet.png'),
    },
    {
      id: 'warrior-dawnforged',
      characterClass: 'Warrior',
      name: 'Dawnforged Set',
      armorName: 'Dawnforged Plate',
      weaponName: 'Solaris Greatsword',
      rarity: 'Rare',
      unlockLevel: 3,
      description: 'Radiant plate that rewards an unbroken forward charge.',
      bonusText: '+100 HP · +7% raid damage',
      damageBonus: 0.07,
      maxHpBonus: 100,
      accent: '#FFD46A',
      source: require('../assets/sprites/gear-warrior-dawnforged.png'),
    },
    {
      id: 'warrior-voidbreaker',
      characterClass: 'Warrior',
      name: 'Voidbreaker Set',
      armorName: 'Voidbreaker Aegis',
      weaponName: 'Abyssal Greatblade',
      rarity: 'Legendary',
      unlockLevel: 6,
      description: 'Raid-forged obsidian armor built to shatter titans.',
      bonusText: '+180 HP · +13% raid damage',
      damageBonus: 0.13,
      maxHpBonus: 180,
      accent: '#B36CFF',
      source: require('../assets/sprites/gear-warrior-voidbreaker.png'),
    },
  ],
  Scholar: [
    {
      id: 'scholar-archive',
      characterClass: 'Scholar',
      name: 'Archive Set',
      armorName: 'Grand Archive Coat',
      weaponName: 'Prism Wand & Codex',
      rarity: 'Starter',
      unlockLevel: 1,
      description: 'Formal fieldwear for practical arcane study.',
      bonusText: '+25 HP · +3% raid damage',
      damageBonus: 0.03,
      maxHpBonus: 25,
      accent: '#6FA8FF',
      source: require('../assets/sprites/hero-scholar.png'),
    },
    {
      id: 'scholar-stormcall',
      characterClass: 'Scholar',
      name: 'Stormcall Set',
      armorName: 'Stormcall Regalia',
      weaponName: 'Fulminant Staff',
      rarity: 'Rare',
      unlockLevel: 3,
      description: 'Conductive runeweave turns focus into lightning.',
      bonusText: '+70 HP · +9% raid damage',
      damageBonus: 0.09,
      maxHpBonus: 70,
      accent: '#58C8FF',
      source: require('../assets/sprites/gear-scholar-stormcall.png'),
    },
    {
      id: 'scholar-chronarch',
      characterClass: 'Scholar',
      name: 'Chronarch Set',
      armorName: 'Chronarch Vestments',
      weaponName: 'Celestial Grimoire',
      rarity: 'Legendary',
      unlockLevel: 6,
      description: 'Regalia woven with maps of impossible constellations.',
      bonusText: '+120 HP · +15% raid damage',
      damageBonus: 0.15,
      maxHpBonus: 120,
      accent: '#F2C96D',
      source: require('../assets/sprites/gear-scholar-chronarch.png'),
    },
  ],
  Monk: [
    {
      id: 'monk-lotus',
      characterClass: 'Monk',
      name: 'Lotus Set',
      armorName: 'Lotus Temple Wraps',
      weaponName: 'Focused Handwraps',
      rarity: 'Starter',
      unlockLevel: 1,
      description: 'Light ceremonial wraps that leave movement unrestricted.',
      bonusText: '+50 HP · +2% raid damage',
      damageBonus: 0.02,
      maxHpBonus: 50,
      accent: '#B087FF',
      source: require('../assets/sprites/hero-monk.png'),
    },
    {
      id: 'monk-crimson-tempest',
      characterClass: 'Monk',
      name: 'Crimson Tempest Set',
      armorName: 'Crimson Battle Robes',
      weaponName: 'Twin Dragon Fists',
      rarity: 'Rare',
      unlockLevel: 3,
      description: 'Every measured breath lands with draconic force.',
      bonusText: '+100 HP · +7% raid damage',
      damageBonus: 0.07,
      maxHpBonus: 100,
      accent: '#FF665F',
      source: require('../assets/sprites/gear-monk-crimson-tempest.png'),
    },
    {
      id: 'monk-jade-dragon',
      characterClass: 'Monk',
      name: 'Jade Dragon Set',
      armorName: 'Jade Sage Raiment',
      weaponName: 'Dragon Spirit Staff',
      rarity: 'Legendary',
      unlockLevel: 6,
      description: 'Ancient armor for a body and mind moving as one.',
      bonusText: '+175 HP · +12% raid damage',
      damageBonus: 0.12,
      maxHpBonus: 175,
      accent: '#79D3A4',
      source: require('../assets/sprites/gear-monk-jade-dragon.png'),
    },
  ],
  Ranger: [
    {
      id: 'ranger-wayfinder',
      characterClass: 'Ranger',
      name: 'Wayfinder Set',
      armorName: 'Wayfinder Leathers',
      weaponName: 'Silverwood Bow',
      rarity: 'Starter',
      unlockLevel: 1,
      description: 'Reliable trail gear for the first long ascent.',
      bonusText: '+30 HP · +3% raid damage',
      damageBonus: 0.03,
      maxHpBonus: 30,
      accent: '#4BC5C5',
      source: require('../assets/sprites/hero-ranger.png'),
    },
    {
      id: 'ranger-frostwind',
      characterClass: 'Ranger',
      name: 'Frostwind Set',
      armorName: 'Frostwind Scoutmail',
      weaponName: 'Glacier Recurve',
      rarity: 'Rare',
      unlockLevel: 3,
      description: 'Winter armor that stays silent over frozen ground.',
      bonusText: '+75 HP · +9% raid damage',
      damageBonus: 0.09,
      maxHpBonus: 75,
      accent: '#86D9FF',
      source: require('../assets/sprites/gear-ranger-frostwind.png'),
    },
    {
      id: 'ranger-starfall',
      characterClass: 'Ranger',
      name: 'Starfall Set',
      armorName: 'Starfall Warden Mail',
      weaponName: 'Astral Longbow',
      rarity: 'Legendary',
      unlockLevel: 6,
      description: 'A constellation-bound loadout for impossible shots.',
      bonusText: '+130 HP · +15% raid damage',
      damageBonus: 0.15,
      maxHpBonus: 130,
      accent: '#A977FF',
      source: require('../assets/sprites/gear-ranger-starfall.png'),
    },
  ],
};

export const DEFAULT_GEAR_SET_IDS: Record<CharacterClassName, GearSetId> = {
  Warrior: 'warrior-nightguard',
  Scholar: 'scholar-archive',
  Monk: 'monk-lotus',
  Ranger: 'ranger-wayfinder',
};

export const GEAR_SET_IDS = Object.values(GEAR_SETS)
  .flat()
  .map((gear) => gear.id);

export function getGearSet(id: GearSetId) {
  return Object.values(GEAR_SETS)
    .flat()
    .find((gear) => gear.id === id);
}

export function getEquippedGearSet(
  characterClass: CharacterClassName,
  id: GearSetId,
) {
  const gear = getGearSet(id);
  return gear?.characterClass === characterClass
    ? gear
    : GEAR_SETS[characterClass][0];
}
