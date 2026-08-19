import type { GearSetDefinition } from './gearData';
import type {
  CharacterClassName,
  QuestDefinition,
  StatName,
} from './gameData';
import { CHARACTER_CLASSES, getEffectiveAttributePower } from './gameData';

export type CombatRatingBreakdown = {
  total: number;
  levelPower: number;
  attributePower: number;
  gearPower: number;
  skillPower: number;
  focusPower: number;
};

export type LevelMilestone = {
  level: number;
  title: string;
  detail: string;
  icon: string;
};

const CLASS_MILESTONES: Record<CharacterClassName, Record<number, string>> = {
  Warrior: {
    3: 'Dawnforged equipment and Forged Fighter form',
    6: 'Voidbreaker equipment and Vanguard form',
    10: 'War Champion form and advanced skill tier',
    15: 'Titanborn form',
    20: 'Worldbreaker final form',
  },
  Scholar: {
    3: 'Stormcall equipment and Runebinder form',
    6: 'Chronarch equipment and Spellwright form',
    10: 'Grand Savant form and advanced skill tier',
    15: 'Chronarch form',
    20: 'Event Sage final form',
  },
  Monk: {
    3: 'Crimson Tempest equipment and Flow Disciple form',
    6: 'Jade Dragon equipment and Lotus Adept form',
    10: 'Temple Master form and advanced skill tier',
    15: 'Jade Sage form',
    20: 'Dragon Soul final form',
  },
  Ranger: {
    3: 'Frostwind equipment and Pathfinder form',
    6: 'Starfall equipment and Wild Warden form',
    10: 'Storm Scout form and advanced skill tier',
    15: 'Star Hunter form',
    20: 'Horizon Keeper final form',
  },
};

export function getCombatRating(
  characterClass: CharacterClassName,
  level: number,
  stats: Record<StatName, number>,
  gear: GearSetDefinition,
  unlockedSkillCount: number,
): CombatRatingBreakdown {
  const focus = CHARACTER_CLASSES[characterClass].focus;
  const effectiveStats = Object.values(stats).reduce(
    (sum, value) => sum + getEffectiveAttributePower(value),
    0,
  );
  const levelPower = Math.max(1, level) * 90;
  const attributePower = Math.round(effectiveStats * 24);
  const focusPower = Math.round(getEffectiveAttributePower(stats[focus]) * 16);
  const gearPower = Math.round(
    gear.maxHpBonus * 0.8 + gear.damageBonus * 1800,
  );
  const skillPower = unlockedSkillCount * 45;

  return {
    total: levelPower + attributePower + focusPower + gearPower + skillPower,
    levelPower,
    attributePower,
    focusPower,
    gearPower,
    skillPower,
  };
}

export function getNextMilestone(
  characterClass: CharacterClassName,
  level: number,
): LevelMilestone {
  const milestoneLevels = [3, 6, 10, 15, 20];
  const nextLevel = milestoneLevels.find((candidate) => candidate > level)
    ?? Math.ceil((level + 1) / 5) * 5;
  return {
    level: nextLevel,
    title: nextLevel <= 20 ? 'EVOLUTION MILESTONE' : 'MASTERY MILESTONE',
    detail:
      CLASS_MILESTONES[characterClass][nextLevel]
      ?? `New skill point and ${characterClass} mastery growth`,
    icon: nextLevel <= 20 ? CHARACTER_CLASSES[characterClass].icon : 'progress-xp',
  };
}

export function getFeaturedQuestIds(
  classQuests: readonly QuestDefinition[],
  sharedQuests: readonly QuestDefinition[],
) {
  const classChallenge = classQuests.find(
    (quest) => quest.difficulty === 'Challenge',
  );
  const classCore = classQuests.find(
    (quest) => quest.difficulty === 'Core' && quest.id !== classChallenge?.id,
  );
  const shared = sharedQuests.find((quest) => quest.difficulty === 'Core')
    ?? sharedQuests[0];
  return [classChallenge ?? classQuests[0], classCore ?? classQuests[1], shared]
    .filter((quest): quest is QuestDefinition => Boolean(quest))
    .map((quest) => quest.id);
}

export function getQuestCombatImpact(
  quest: QuestDefinition,
  characterClass: CharacterClassName,
  statGain: number,
) {
  const focused = CHARACTER_CLASSES[characterClass].focus === quest.stat;
  const statEffects: Record<StatName, string> = {
    strength: 'stronger attacks',
    intelligence: 'more opening energy',
    mindfulness: 'stronger healing',
    endurance: 'more battle HP',
    vitality: 'higher maximum HP',
  };
  return `+${statGain} ${quest.stat} means ${statEffects[quest.stat]}${
    focused ? ' and advances your class specialization' : ''}.`;
}
