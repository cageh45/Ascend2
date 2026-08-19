import { ImageSourcePropType } from 'react-native';

import { auditGearMoveSetBalance } from './combatBalance';
import { CharacterClassName } from './gameData';

export type GearSetId =
  | 'warrior-nightguard'
  | 'warrior-dawnforged'
  | 'warrior-voidbreaker'
  | 'warrior-stormguard'
  | 'scholar-archive'
  | 'scholar-stormcall'
  | 'scholar-chronarch'
  | 'scholar-riftweaver'
  | 'monk-lotus'
  | 'monk-crimson-tempest'
  | 'monk-jade-dragon'
  | 'monk-sunspire'
  | 'ranger-wayfinder'
  | 'ranger-frostwind'
  | 'ranger-starfall'
  | 'ranger-galehunter';

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
  moveSet?: GearMoveSet;
};

export type GearMoveSet = {
  identity: string;
  actions: {
    quick: GearActionOverride;
    power: GearActionOverride;
    focus: GearActionOverride;
  };
};

export type GearActionOverride = {
  name: string;
  icon: string;
  damageMultiplier?: number;
  healingMultiplier?: number;
  energyCostDelta?: number;
  energyGainDelta?: number;
  guardDelta?: number;
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
    {
      id: 'warrior-stormguard', characterClass: 'Warrior', name: 'Stormguard Set',
      armorName: 'Stormguard Plate', weaponName: 'Thunderhead Maul', rarity: 'Legendary',
      unlockLevel: 10, description: 'Cobalt plate grounds the storm before returning it through a crushing hammer.',
      bonusText: '+220 HP · +16% raid damage', damageBonus: 0.16, maxHpBonus: 220,
      accent: '#5BCBFF', source: require('../assets/sprites/gear-warrior-stormguard.png'),
      moveSet: {
        identity: 'Storm guard · crushing BREAK chains',
        actions: {
          quick: { name: 'Static Sweep', icon: '⚡', damageMultiplier: 0.9, energyGainDelta: 4 },
          power: { name: 'Thunderfall', icon: '🔨', damageMultiplier: 1.12, energyCostDelta: 10, guardDelta: 0.02 },
          focus: { name: 'Grounding Field', icon: '🛡️', healingMultiplier: 0.75, energyGainDelta: 4, guardDelta: 0.08 },
        },
      },
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
    {
      id: 'scholar-riftweaver', characterClass: 'Scholar', name: 'Riftweaver Set',
      armorName: 'Riftweaver Mantle', weaponName: 'Orbiting Riftblade', rarity: 'Legendary',
      unlockLevel: 10, description: 'A ring-blade focus folds distance into a precise arcane edge.',
      bonusText: '+145 HP · +18% raid damage', damageBonus: 0.18, maxHpBonus: 145,
      accent: '#49E4DF', source: require('../assets/sprites/gear-scholar-riftweaver.png'),
      moveSet: {
        identity: 'Rift control · high-risk spell loops',
        actions: {
          quick: { name: 'Orbit Cut', icon: '◉', energyGainDelta: 2 },
          power: { name: 'Event Horizon', icon: '🌀', damageMultiplier: 1.12, energyCostDelta: 10 },
          focus: { name: 'Fold Time', icon: '⌛', healingMultiplier: 0.7, energyGainDelta: 8, guardDelta: -0.05 },
        },
      },
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
    {
      id: 'monk-sunspire', characterClass: 'Monk', name: 'Sunspire Set',
      armorName: 'Sunspire Vestments', weaponName: 'Dawnwheel Polearm', rarity: 'Legendary',
      unlockLevel: 10, description: 'Radiant battle robes channel breath through a sun-disc polearm.',
      bonusText: '+205 HP · +14% raid damage', damageBonus: 0.14, maxHpBonus: 205,
      accent: '#FFBE45', source: require('../assets/sprites/gear-monk-sunspire.png'),
      moveSet: {
        identity: 'Solar reach · healing attack rhythm',
        actions: {
          quick: { name: 'Dawnwheel Arc', icon: '☀️', healingMultiplier: 1.2 },
          power: { name: 'Zenith Strike', icon: '🔥', damageMultiplier: 1.08, healingMultiplier: 1.1, energyCostDelta: 5 },
          focus: { name: 'Sunrise Form', icon: '🌅', healingMultiplier: 1.15, energyGainDelta: -5, guardDelta: -0.05 },
        },
      },
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
    {
      id: 'ranger-galehunter', characterClass: 'Ranger', name: 'Galehunter Set',
      armorName: 'Galehunter Wind-Silk', weaponName: 'Twin Crescent Crossbows', rarity: 'Legendary',
      unlockLevel: 10, description: 'Wind-silk armor and paired crossbows trade defense for relentless tempo.',
      bonusText: '+155 HP · +18% raid damage', damageBonus: 0.18, maxHpBonus: 155,
      accent: '#A8F0A3', source: require('../assets/sprites/gear-ranger-galehunter.png'),
      moveSet: {
        identity: 'Twin volleys · relentless momentum',
        actions: {
          quick: { name: 'Crescent Flurry', icon: '➶', damageMultiplier: 1.03, energyGainDelta: 3, guardDelta: -0.02 },
          power: { name: 'Crosswind Burst', icon: '💨', damageMultiplier: 1.1, energyCostDelta: 8 },
          focus: { name: 'Slipstream', icon: '🍃', healingMultiplier: 0.72, energyGainDelta: 6, guardDelta: 0.05 },
        },
      },
    },
  ],
};

if (__DEV__) {
  const balanceIssues = Object.entries(GEAR_SETS).flatMap(
    ([characterClass, sets]) =>
      sets.flatMap((set) => {
        if (!set.moveSet) return [];
        return auditGearMoveSetBalance(
          characterClass as CharacterClassName,
          set.moveSet,
        ).issues.map((issue) => `${set.name}: ${issue}`);
      }),
  );
  if (balanceIssues.length > 0) {
    console.warn(`Gear move balance warnings:\n${balanceIssues.join('\n')}`);
  }
}

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
