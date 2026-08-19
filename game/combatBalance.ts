import {
  CLASS_COMBAT_KITS,
  getCombatKit,
  type CoreCombatAction,
} from './combatData';
import type { CharacterClassName } from './gameData';
import type { GearMoveSet } from './gearData';
import type { RaidBossId } from './raidData';

export type GearMoveBalanceReport = {
  damageRatio: number;
  healingRatio: number;
  netEnergyDelta: number;
  guardDelta: number;
  issues: string[];
};

const MOVE_SET_DAMAGE_LIMIT = 1.07;
const MOVE_SET_HEALING_LIMIT = 1.18;
const MOVE_SET_ENERGY_ADVANTAGE_LIMIT = 6;
const MOVE_SET_GUARD_ADVANTAGE_LIMIT = 0.12;
const SINGLE_ACTION_DAMAGE_LIMIT = 1.15;
const SINGLE_ACTION_HEALING_LIMIT = 1.25;

function getRepresentativeRotation(
  characterClass: CharacterClassName,
  moveSet?: GearMoveSet,
) {
  const kit = moveSet
    ? getCombatKit(characterClass, moveSet)
    : CLASS_COMBAT_KITS[characterClass];
  const [quick, power, focus] = kit.actions;
  const powerMechanicMultiplier =
    characterClass === 'Scholar'
      ? 1.25
      : characterClass === 'Ranger'
        ? 1.35
        : 1;
  const averageDamage = (action: CoreCombatAction) =>
    (action.damageMin + action.damageMax) / 2;

  return {
    // Two setup attacks, one class-mechanic power attack, and one focus action.
    damage:
      averageDamage(quick) * 2 +
      averageDamage(power) * powerMechanicMultiplier,
    healing: quick.healing * 2 + power.healing + focus.healing,
    netEnergy:
      quick.energyGain * 2 +
      power.energyGain +
      focus.energyGain -
      quick.energyCost * 2 -
      power.energyCost -
      focus.energyCost,
    guard: quick.guardPercent * 2 + power.guardPercent + focus.guardPercent,
  };
}

/**
 * Compares an alternate gear move set with its class's base four-action loop.
 * The limits intentionally allow a focused sidegrade, but reject excessive
 * burst, sustain, resource generation, or a loadout that improves everything.
 */
export function auditGearMoveSetBalance(
  characterClass: CharacterClassName,
  moveSet: GearMoveSet,
): GearMoveBalanceReport {
  const base = getRepresentativeRotation(characterClass);
  const alternate = getRepresentativeRotation(characterClass, moveSet);
  const damageRatio = alternate.damage / base.damage;
  const healingRatio = base.healing > 0 ? alternate.healing / base.healing : 1;
  const netEnergyDelta = alternate.netEnergy - base.netEnergy;
  const guardDelta = alternate.guard - base.guard;
  const issues: string[] = [];
  const baseActions = CLASS_COMBAT_KITS[characterClass].actions;
  const alternateActions = getCombatKit(characterClass, moveSet).actions;

  alternateActions.forEach((action, index) => {
    const baseAction = baseActions[index];
    if (
      baseAction.damageMax > 0 &&
      action.damageMax / baseAction.damageMax > SINGLE_ACTION_DAMAGE_LIMIT
    ) {
      issues.push(
        `${action.name} deals over 15% more damage than its base action`,
      );
    }
    if (
      baseAction.healing > 0 &&
      action.healing / baseAction.healing > SINGLE_ACTION_HEALING_LIMIT
    ) {
      issues.push(`${action.name} heals over 25% more than its base action`);
    }
  });

  if (damageRatio > MOVE_SET_DAMAGE_LIMIT) {
    issues.push(
      `representative damage is ${Math.round((damageRatio - 1) * 100)}% above the base kit`,
    );
  }
  if (healingRatio > MOVE_SET_HEALING_LIMIT) {
    issues.push(
      `representative healing is ${Math.round((healingRatio - 1) * 100)}% above the base kit`,
    );
  }
  if (netEnergyDelta > MOVE_SET_ENERGY_ADVANTAGE_LIMIT) {
    issues.push(`representative energy is ${netEnergyDelta} above the base kit`);
  }
  if (guardDelta > MOVE_SET_GUARD_ADVANTAGE_LIMIT) {
    issues.push(
      `representative guard is ${Math.round(guardDelta * 100)} points above the base kit`,
    );
  }

  const noMeaningfulTradeoff =
    damageRatio >= 1 &&
    healingRatio >= 1 &&
    netEnergyDelta >= 0 &&
    guardDelta >= 0 &&
    (damageRatio > 1.02 ||
      healingRatio > 1.02 ||
      netEnergyDelta > 2 ||
      guardDelta > 0.02);
  if (noMeaningfulTradeoff) {
    issues.push(
      'the alternate loop improves every measured dimension without a tradeoff',
    );
  }

  return { damageRatio, healingRatio, netEnergyDelta, guardDelta, issues };
}

export type BossPhase = 1 | 2 | 3;
export type BossIntentKind = 'strike' | 'heavy' | 'drain' | 'fortify';

export type BossIntent = {
  kind: BossIntentKind;
  name: string;
  description: string;
  icon: string;
  color: string;
  damageMultiplier: number;
  guardPierce: number;
  energyDrain: number;
  shieldPercent: number;
};

type IntentTemplate = Omit<BossIntent, 'name' | 'description'> & {
  names: Partial<Record<RaidBossId, string>>;
  descriptions: Partial<Record<RaidBossId, string>>;
};

const INTENTS: Record<BossIntentKind, IntentTemplate> = {
  strike: {
    kind: 'strike',
    names: {
      'iron-wyrm': 'Searing Claw',
      'thorn-empress': 'Briar Lash',
      'storm-leviathan': 'Tempest Fang',
      'ash-colossus': 'Molten Fist',
      moonfang: 'Lunar Pounce',
      'void-titan': 'Abyssal Cleave',
    },
    descriptions: {},
    icon: 'combat-impact',
    color: '#FF8A6A',
    damageMultiplier: 1,
    guardPierce: 0,
    energyDrain: 0,
    shieldPercent: 0,
  },
  heavy: {
    kind: 'heavy',
    names: {
      'iron-wyrm': 'Furnace Detonation',
      'thorn-empress': 'Crown of Thorns',
      'storm-leviathan': 'Skybreaker Bolt',
      'ash-colossus': 'Caldera Slam',
      moonfang: 'Eclipse Hunt',
      'void-titan': 'Starfall Collapse',
    },
    descriptions: {
      'iron-wyrm': 'A devastating blast is charging. Guard or break it.',
      'thorn-empress': 'The throne erupts beneath the arena.',
      'storm-leviathan': 'Lightning converges on your position.',
      'ash-colossus': 'The entire chamber is about to buckle.',
      moonfang: 'The guardian vanishes for a lethal pounce.',
      'void-titan': 'A dying star is being pulled into the arena.',
    },
    icon: 'status-warning',
    color: '#FF5E72',
    damageMultiplier: 1.55,
    guardPierce: 0.18,
    energyDrain: 0,
    shieldPercent: 0,
  },
  drain: {
    kind: 'drain',
    names: {
      'iron-wyrm': 'Heat Siphon',
      'thorn-empress': 'Withering Bloom',
      'storm-leviathan': 'Static Devourer',
      'ash-colossus': 'Cinder Tax',
      moonfang: 'Predator’s Mark',
      'void-titan': 'Event Horizon',
    },
    descriptions: {},
    icon: 'resource-energy',
    color: '#A98BFF',
    damageMultiplier: 0.82,
    guardPierce: 0.08,
    energyDrain: 22,
    shieldPercent: 0,
  },
  fortify: {
    kind: 'fortify',
    names: {
      'iron-wyrm': 'Iron Scale',
      'thorn-empress': 'Regrowing Court',
      'storm-leviathan': 'Cyclone Wall',
      'ash-colossus': 'Obsidian Shell',
      moonfang: 'Moonlit Aegis',
      'void-titan': 'Gravity Ward',
    },
    descriptions: {},
    icon: 'combat-shield',
    color: '#69C9FF',
    damageMultiplier: 0.58,
    guardPierce: 0,
    energyDrain: 0,
    shieldPercent: 0.09,
  },
};

const BOSS_PATTERNS: Record<RaidBossId, readonly BossIntentKind[]> = {
  'iron-wyrm': ['strike', 'drain', 'heavy', 'fortify'],
  'thorn-empress': ['strike', 'fortify', 'drain', 'heavy'],
  'storm-leviathan': ['drain', 'strike', 'heavy', 'strike'],
  'ash-colossus': ['strike', 'fortify', 'heavy', 'strike'],
  moonfang: ['strike', 'drain', 'strike', 'heavy'],
  'void-titan': ['drain', 'heavy', 'fortify', 'heavy'],
};

export function getBossPhase(currentHp: number, maxHp: number): BossPhase {
  const ratio = maxHp > 0 ? currentHp / maxHp : 0;
  if (ratio <= 0.3) return 3;
  if (ratio <= 0.65) return 2;
  return 1;
}

export function getBossPhaseName(bossId: RaidBossId, phase: BossPhase) {
  const names: Record<RaidBossId, readonly [string, string, string]> = {
    'iron-wyrm': ['Tempered Scales', 'Overheated', 'Core Meltdown'],
    'thorn-empress': ['Royal Guard', 'Poisoned Crown', 'Wild Dominion'],
    'storm-leviathan': ['Gathering Storm', 'Thunderhead', 'Cataclysm'],
    'ash-colossus': ['Stonebound', 'Molten Core', 'Eruption'],
    moonfang: ['The Stalk', 'Blood Moon', 'Total Eclipse'],
    'void-titan': ['Gravity Well', 'Starless Night', 'Final Singularity'],
  };
  return names[bossId][phase - 1];
}

export function getBossIntent(
  bossId: RaidBossId,
  bossTurn: number,
  phase: BossPhase,
): BossIntent {
  const pattern = BOSS_PATTERNS[bossId];
  const phaseOffset = phase === 3 ? 1 : phase === 2 ? 0 : -1;
  const index = Math.max(0, bossTurn + phaseOffset) % pattern.length;
  const template = INTENTS[pattern[index]];
  return {
    ...template,
    name: template.names[bossId] ?? 'Boss Technique',
    description:
      template.descriptions[bossId] ??
      (template.kind === 'fortify'
        ? 'The boss prepares a protective ward.'
        : template.kind === 'drain'
          ? 'This hit will drain energy on impact.'
          : template.kind === 'heavy'
            ? 'A crushing attack will partially pierce guard.'
            : 'A direct attack is coming.'),
  };
}

export function getBossPhaseAttackMultiplier(phase: BossPhase) {
  return phase === 3 ? 1.38 : phase === 2 ? 1.18 : 1;
}

export function getPhaseBarrier(maxHp: number, phase: BossPhase) {
  if (phase === 1) return 0;
  return Math.round(maxHp * (phase === 3 ? 0.1 : 0.07));
}

export function getActionStagger(action: CoreCombatAction) {
  if (action.damageMax <= 0) return 0;
  return action.id === 'power' ? 42 : 27;
}

export function getAbilityStagger(tier: number) {
  return tier >= 8 ? 55 : tier >= 3 ? 48 : 34;
}

export function getComboMultiplier(combo: number) {
  return 1 + Math.min(4, Math.max(0, combo)) * 0.07;
}

export function getFocusCooldown() {
  return 3;
}

export function getAbilityCooldown(tier: number) {
  return tier >= 8 ? 5 : tier >= 3 ? 4 : 2;
}

export function tickCooldowns(
  cooldowns: Readonly<Record<string, number>>,
  usedId: string,
  usedCooldown: number,
) {
  const next: Record<string, number> = {};
  Object.entries(cooldowns).forEach(([id, turns]) => {
    const remaining = Math.max(0, turns - 1);
    if (remaining > 0) next[id] = remaining;
  });
  if (usedCooldown > 0) next[usedId] = usedCooldown;
  return next;
}
