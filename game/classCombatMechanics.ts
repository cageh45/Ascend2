import type { CoreCombatAction } from './combatData';
import type { CharacterClassName } from './gameData';

export type ClassCombatStatus = {
  id: 'bleed' | 'exposed' | 'renewal' | 'marked' | null;
  turns: number;
  potency: number;
};

export const EMPTY_CLASS_STATUS: ClassCombatStatus = {
  id: null,
  turns: 0,
  potency: 0,
};

export function getClassMechanicName(characterClass: CharacterClassName) {
  return {
    Warrior: 'Rend',
    Scholar: 'Arcane Exposure',
    Monk: 'Renewal',
    Ranger: 'Hunter’s Mark',
  }[characterClass];
}

export function resolveClassAction(
  characterClass: CharacterClassName,
  action: CoreCombatAction,
  activeStatus: ClassCombatStatus,
  primaryPower: number,
) {
  let damageMultiplier = 1;
  let nextStatus = activeStatus;
  let bonusHealing = 0;
  let message: string | null = null;

  if (characterClass === 'Warrior' && action.id === 'power') {
    nextStatus = {
      id: 'bleed',
      turns: 3,
      potency: Math.round(28 + primaryPower * 2.2),
    };
    message = `REND applied · ${nextStatus.potency} damage for 3 turns`;
  } else if (characterClass === 'Scholar') {
    if (action.id === 'quick') {
      nextStatus = { id: 'exposed', turns: 2, potency: 25 };
      message = 'ARCANE EXPOSURE applied · the next power attack deals +25%';
    } else if (action.id === 'power' && activeStatus.id === 'exposed') {
      damageMultiplier = 1 + activeStatus.potency / 100;
      nextStatus = EMPTY_CLASS_STATUS;
      message = 'ARCANE EXPOSURE consumed for amplified damage';
    }
  } else if (characterClass === 'Monk' && action.id === 'focus') {
    nextStatus = {
      id: 'renewal',
      turns: 3,
      potency: Math.round(24 + primaryPower * 1.8),
    };
    message = `RENEWAL active · restore ${nextStatus.potency} HP after enemy turns`;
  } else if (characterClass === 'Ranger') {
    if (action.id === 'quick') {
      nextStatus = { id: 'marked', turns: 3, potency: 35 };
      message = 'HUNTER’S MARK applied · the next power attack deals +35%';
    } else if (action.id === 'power' && activeStatus.id === 'marked') {
      damageMultiplier = 1 + activeStatus.potency / 100;
      nextStatus = EMPTY_CLASS_STATUS;
      message = 'HUNTER’S MARK consumed for a precision strike';
    }
  }

  if (activeStatus.id === 'renewal' && action.id !== 'focus') {
    bonusHealing = activeStatus.potency;
  }

  return { damageMultiplier, nextStatus, bonusHealing, message };
}

export function tickClassStatusAfterBossTurn(status: ClassCombatStatus) {
  if (!status.id || status.turns <= 1) return EMPTY_CLASS_STATUS;
  return { ...status, turns: status.turns - 1 };
}
