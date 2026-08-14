import { CharacterClassName } from './gameData';

export type SkillBonuses = {
  maxHp: number;
  damageBonus: number;
  healingBonus: number;
  startingEnergy: number;
  damageReduction: number;
  energyGain: number;
};

export type ActiveAbility = {
  damageMin: number;
  damageMax: number;
  healing: number;
  energyCost: number;
  energyGain: number;
  guardPercent: number;
};

export type SkillNode = {
  id: string;
  name: string;
  description: string;
  effectText: string;
  icon: string;
  tier: number;
  kind: 'active' | 'passive';
  cost: number;
  requiredLevel: number;
  parentIds: readonly string[];
  requiresAllParents?: boolean;
  active?: ActiveAbility;
  passive?: Partial<SkillBonuses>;
};

const warriorSkills: readonly SkillNode[] = [
  {
    id: 'warrior-shield-bash',
    name: 'Shield Bash',
    description: 'Drive forward and stagger the enemy behind your guard.',
    effectText: '190–240 damage · 35% guard · +10 energy',
    icon: '🛡️',
    tier: 0,
    kind: 'active',
    cost: 0,
    requiredLevel: 1,
    parentIds: [],
    active: { damageMin: 190, damageMax: 240, healing: 0, energyCost: 0, energyGain: 10, guardPercent: 0.35 },
  },
  {
    id: 'warrior-iron-will',
    name: 'Iron Will',
    description: 'Condition your body to endure heavier punishment.',
    effectText: '+90 maximum HP · 5% damage resistance',
    icon: '❤️',
    tier: 1,
    kind: 'passive',
    cost: 1,
    requiredLevel: 2,
    parentIds: ['warrior-shield-bash'],
    passive: { maxHp: 90, damageReduction: 0.05 },
  },
  {
    id: 'warrior-heavy-hand',
    name: 'Heavy Hand',
    description: 'Put your full strength behind every attack.',
    effectText: '+12% attack damage',
    icon: '💥',
    tier: 1,
    kind: 'passive',
    cost: 1,
    requiredLevel: 2,
    parentIds: ['warrior-shield-bash'],
    passive: { damageBonus: 0.12 },
  },
  {
    id: 'warrior-second-wind',
    name: 'Second Wind',
    description: 'Recover faster when a battle begins to turn.',
    effectText: '+30% healing · +10 starting energy',
    icon: '🌬️',
    tier: 2,
    kind: 'passive',
    cost: 1,
    requiredLevel: 3,
    parentIds: ['warrior-iron-will'],
    passive: { healingBonus: 0.3, startingEnergy: 10 },
  },
  {
    id: 'warrior-adrenaline',
    name: 'Adrenaline',
    description: 'Build momentum each time your blade connects.',
    effectText: '+8% damage · +5 energy from abilities',
    icon: '🔥',
    tier: 2,
    kind: 'passive',
    cost: 1,
    requiredLevel: 3,
    parentIds: ['warrior-heavy-hand'],
    passive: { damageBonus: 0.08, energyGain: 5 },
  },
  {
    id: 'warrior-titans-wrath',
    name: "Titan's Wrath",
    description: 'Unleash the full force of a master warrior.',
    effectText: '480–620 damage · 25% guard · costs 60 energy',
    icon: '👑',
    tier: 3,
    kind: 'active',
    cost: 2,
    requiredLevel: 5,
    parentIds: ['warrior-second-wind', 'warrior-adrenaline'],
    active: { damageMin: 480, damageMax: 620, healing: 0, energyCost: 60, energyGain: 0, guardPercent: 0.25 },
  },
  {
    id: 'warrior-fortress-heart', name: 'Fortress Heart',
    description: 'Turn discipline into a reserve of unbreakable endurance.',
    effectText: '+120 maximum HP · 4% damage resistance', icon: '🏰', tier: 4,
    kind: 'passive', cost: 1, requiredLevel: 7, parentIds: ['warrior-titans-wrath'],
    passive: { maxHp: 120, damageReduction: 0.04 },
  },
  {
    id: 'warrior-blood-tempered', name: 'Blood Tempered',
    description: 'Every hard battle sharpens your offense and recovery.',
    effectText: '+8% attack damage · +15% healing', icon: '🩸', tier: 4,
    kind: 'passive', cost: 1, requiredLevel: 7, parentIds: ['warrior-titans-wrath'],
    passive: { damageBonus: 0.08, healingBonus: 0.15 },
  },
  {
    id: 'warrior-aegis-crash', name: 'Aegis Crash',
    description: 'Meet the enemy head-on behind a wall of steel.',
    effectText: '360–450 damage · 55% guard · costs 35 energy', icon: '🔰', tier: 5,
    kind: 'active', cost: 2, requiredLevel: 9, parentIds: ['warrior-fortress-heart'],
    active: { damageMin: 360, damageMax: 450, healing: 0, energyCost: 35, energyGain: 0, guardPercent: 0.55 },
  },
  {
    id: 'warrior-warpath-cleave', name: 'Warpath Cleave',
    description: 'Sweep the arena with a relentless two-handed strike.',
    effectText: '520–650 damage · 10% guard · costs 45 energy', icon: '🪓', tier: 5,
    kind: 'active', cost: 2, requiredLevel: 9, parentIds: ['warrior-blood-tempered'],
    active: { damageMin: 520, damageMax: 650, healing: 0, energyCost: 45, energyGain: 0, guardPercent: 0.1 },
  },
  {
    id: 'warrior-guardians-tempo', name: "Guardian's Tempo",
    description: 'Measured defense keeps your strongest techniques available.',
    effectText: '+10 starting energy · +6 ability energy', icon: '🥁', tier: 6,
    kind: 'passive', cost: 1, requiredLevel: 12, parentIds: ['warrior-aegis-crash'],
    passive: { startingEnergy: 10, energyGain: 6 },
  },
  {
    id: 'warrior-unyielding-momentum', name: 'Unyielding Momentum',
    description: 'Carry the weight of every blow into the next one.',
    effectText: '+10% attack damage · +6 ability energy', icon: '🚩', tier: 6,
    kind: 'passive', cost: 1, requiredLevel: 12, parentIds: ['warrior-warpath-cleave'],
    passive: { damageBonus: 0.1, energyGain: 6 },
  },
  {
    id: 'warrior-living-bulwark', name: 'Living Bulwark',
    description: 'Become the shield your entire party rallies behind.',
    effectText: '+150 maximum HP · 5% damage resistance', icon: '🗿', tier: 7,
    kind: 'passive', cost: 2, requiredLevel: 15, parentIds: ['warrior-guardians-tempo'],
    passive: { maxHp: 150, damageReduction: 0.05 },
  },
  {
    id: 'warrior-conquerors-drive', name: "Conqueror's Drive",
    description: 'Victory feels inevitable once your assault begins.',
    effectText: '+12% attack damage · +10% healing', icon: '🏆', tier: 7,
    kind: 'passive', cost: 2, requiredLevel: 15, parentIds: ['warrior-unyielding-momentum'],
    passive: { damageBonus: 0.12, healingBonus: 0.1 },
  },
  {
    id: 'warrior-worldbreaker', name: 'Worldbreaker',
    description: 'Unite absolute defense and devastating force in one final blow.',
    effectText: '820–1,020 damage · heal 80 HP · 40% guard · costs 80 energy', icon: '🌋', tier: 8,
    kind: 'active', cost: 3, requiredLevel: 20,
    parentIds: ['warrior-living-bulwark', 'warrior-conquerors-drive'], requiresAllParents: true,
    active: { damageMin: 820, damageMax: 1020, healing: 80, energyCost: 80, energyGain: 0, guardPercent: 0.4 },
  },
];

const scholarSkills: readonly SkillNode[] = [
  {
    id: 'scholar-arcane-bolt',
    name: 'Arcane Bolt',
    description: 'Turn focused thought into a concentrated blast.',
    effectText: '210–280 damage · +12 energy',
    icon: '🔮',
    tier: 0,
    kind: 'active',
    cost: 0,
    requiredLevel: 1,
    parentIds: [],
    active: { damageMin: 210, damageMax: 280, healing: 0, energyCost: 0, energyGain: 12, guardPercent: 0 },
  },
  {
    id: 'scholar-mental-reserve',
    name: 'Mental Reserve',
    description: 'Enter every battle with a prepared mind.',
    effectText: '+20 starting energy',
    icon: '🧠',
    tier: 1,
    kind: 'passive',
    cost: 1,
    requiredLevel: 2,
    parentIds: ['scholar-arcane-bolt'],
    passive: { startingEnergy: 20 },
  },
  {
    id: 'scholar-exploit-weakness',
    name: 'Exploit Weakness',
    description: 'Study the target and strike at structural flaws.',
    effectText: '+14% attack damage',
    icon: '🎯',
    tier: 1,
    kind: 'passive',
    cost: 1,
    requiredLevel: 2,
    parentIds: ['scholar-arcane-bolt'],
    passive: { damageBonus: 0.14 },
  },
  {
    id: 'scholar-calculated-defense',
    name: 'Calculated Defense',
    description: 'Anticipate incoming attacks before they land.',
    effectText: '+45 maximum HP · 8% damage resistance',
    icon: '📐',
    tier: 2,
    kind: 'passive',
    cost: 1,
    requiredLevel: 3,
    parentIds: ['scholar-mental-reserve'],
    passive: { maxHp: 45, damageReduction: 0.08 },
  },
  {
    id: 'scholar-flow-state',
    name: 'Flow State',
    description: 'Make every action feed the next calculation.',
    effectText: '+8 ability energy · +10% healing',
    icon: '✨',
    tier: 2,
    kind: 'passive',
    cost: 1,
    requiredLevel: 3,
    parentIds: ['scholar-exploit-weakness'],
    passive: { energyGain: 8, healingBonus: 0.1 },
  },
  {
    id: 'scholar-meteor-thesis',
    name: 'Meteor Thesis',
    description: 'Prove your theory with overwhelming arcane force.',
    effectText: '520–680 damage · costs 60 energy',
    icon: '☄️',
    tier: 3,
    kind: 'active',
    cost: 2,
    requiredLevel: 5,
    parentIds: ['scholar-calculated-defense', 'scholar-flow-state'],
    active: { damageMin: 520, damageMax: 680, healing: 0, energyCost: 60, energyGain: 0, guardPercent: 0 },
  },
  {
    id: 'scholar-memory-palace', name: 'Memory Palace',
    description: 'Prepare layered reserves before the first spell is cast.',
    effectText: '+15 starting energy · +4 ability energy', icon: '🏛️', tier: 4,
    kind: 'passive', cost: 1, requiredLevel: 7, parentIds: ['scholar-meteor-thesis'],
    passive: { startingEnergy: 15, energyGain: 4 },
  },
  {
    id: 'scholar-arcane-anatomy', name: 'Arcane Anatomy',
    description: 'Map the hidden structure shared by bodies and spells.',
    effectText: '+8% attack damage · +15% healing', icon: '🧬', tier: 4,
    kind: 'passive', cost: 1, requiredLevel: 7, parentIds: ['scholar-meteor-thesis'],
    passive: { damageBonus: 0.08, healingBonus: 0.15 },
  },
  {
    id: 'scholar-chrono-ward', name: 'Chrono Ward',
    description: 'Borrow a safer moment from a more favorable timeline.',
    effectText: '300–380 damage · heal 80 HP · 50% guard · costs 35 energy', icon: '⏳', tier: 5,
    kind: 'active', cost: 2, requiredLevel: 9, parentIds: ['scholar-memory-palace'],
    active: { damageMin: 300, damageMax: 380, healing: 80, energyCost: 35, energyGain: 0, guardPercent: 0.5 },
  },
  {
    id: 'scholar-chain-theorem', name: 'Chain Theorem',
    description: 'Link a sequence of proofs into a cascading arcane strike.',
    effectText: '570–720 damage · costs 50 energy', icon: '🔗', tier: 5,
    kind: 'active', cost: 2, requiredLevel: 9, parentIds: ['scholar-arcane-anatomy'],
    active: { damageMin: 570, damageMax: 720, healing: 0, energyCost: 50, energyGain: 0, guardPercent: 0 },
  },
  {
    id: 'scholar-recursive-insight', name: 'Recursive Insight',
    description: 'Let every solved pattern accelerate the next discovery.',
    effectText: '+10 starting energy · +8 ability energy', icon: '♾️', tier: 6,
    kind: 'passive', cost: 1, requiredLevel: 12, parentIds: ['scholar-chrono-ward'],
    passive: { startingEnergy: 10, energyGain: 8 },
  },
  {
    id: 'scholar-weakpoint-matrix', name: 'Weakpoint Matrix',
    description: 'Model every fracture before the enemy knows it exists.',
    effectText: '+12% attack damage', icon: '🔷', tier: 6,
    kind: 'passive', cost: 1, requiredLevel: 12, parentIds: ['scholar-chain-theorem'],
    passive: { damageBonus: 0.12 },
  },
  {
    id: 'scholar-infinite-library', name: 'Infinite Library',
    description: 'Draw power from a mental archive without end.',
    effectText: '+20 starting energy · +8 ability energy', icon: '📚', tier: 7,
    kind: 'passive', cost: 2, requiredLevel: 15, parentIds: ['scholar-recursive-insight'],
    passive: { startingEnergy: 20, energyGain: 8 },
  },
  {
    id: 'scholar-axiom-armor', name: 'Axiom Armor',
    description: 'Defend yourself with a truth the enemy cannot disprove.',
    effectText: '+110 maximum HP · 8% damage resistance', icon: '🧿', tier: 7,
    kind: 'passive', cost: 2, requiredLevel: 15, parentIds: ['scholar-weakpoint-matrix'],
    passive: { maxHp: 110, damageReduction: 0.08 },
  },
  {
    id: 'scholar-event-horizon', name: 'Event Horizon',
    description: 'Collapse every mastered theorem into an inescapable singularity.',
    effectText: '880–1,080 damage · 20% guard · costs 80 energy', icon: '🌌', tier: 8,
    kind: 'active', cost: 3, requiredLevel: 20,
    parentIds: ['scholar-infinite-library', 'scholar-axiom-armor'], requiresAllParents: true,
    active: { damageMin: 880, damageMax: 1080, healing: 0, energyCost: 80, energyGain: 0, guardPercent: 0.2 },
  },
];

const monkSkills: readonly SkillNode[] = [
  {
    id: 'monk-palm-strike',
    name: 'Restoring Palm',
    description: 'Strike with control while restoring your inner balance.',
    effectText: '170–220 damage · heal 70 HP · 20% guard',
    icon: '🖐️',
    tier: 0,
    kind: 'active',
    cost: 0,
    requiredLevel: 1,
    parentIds: [],
    active: { damageMin: 170, damageMax: 220, healing: 70, energyCost: 0, energyGain: 8, guardPercent: 0.2 },
  },
  {
    id: 'monk-deep-breath',
    name: 'Deep Breath',
    description: 'Draw more strength from every moment of recovery.',
    effectText: '+25% healing · +10 starting energy',
    icon: '🌬️',
    tier: 1,
    kind: 'passive',
    cost: 1,
    requiredLevel: 2,
    parentIds: ['monk-palm-strike'],
    passive: { healingBonus: 0.25, startingEnergy: 10 },
  },
  {
    id: 'monk-stone-stance',
    name: 'Stone Stance',
    description: 'Root yourself so enemy force rolls past you.',
    effectText: '+100 maximum HP · 8% damage resistance',
    icon: '🪨',
    tier: 1,
    kind: 'passive',
    cost: 1,
    requiredLevel: 2,
    parentIds: ['monk-palm-strike'],
    passive: { maxHp: 100, damageReduction: 0.08 },
  },
  {
    id: 'monk-flowing-form',
    name: 'Flowing Form',
    description: 'Let movement carry power without wasted effort.',
    effectText: '+10% damage · +5 ability energy',
    icon: '🌊',
    tier: 2,
    kind: 'passive',
    cost: 1,
    requiredLevel: 3,
    parentIds: ['monk-deep-breath'],
    passive: { damageBonus: 0.1, energyGain: 5 },
  },
  {
    id: 'monk-compassion',
    name: 'Compassion',
    description: 'Transform patience into lasting resilience.',
    effectText: '+20% healing · +50 maximum HP',
    icon: '🩷',
    tier: 2,
    kind: 'passive',
    cost: 1,
    requiredLevel: 3,
    parentIds: ['monk-stone-stance'],
    passive: { healingBonus: 0.2, maxHp: 50 },
  },
  {
    id: 'monk-transcendent-palm',
    name: 'Transcendent Palm',
    description: 'Unite offense, restoration, and perfect defense.',
    effectText: '420–540 damage · heal 160 HP · 40% guard',
    icon: '☯️',
    tier: 3,
    kind: 'active',
    cost: 2,
    requiredLevel: 5,
    parentIds: ['monk-flowing-form', 'monk-compassion'],
    active: { damageMin: 420, damageMax: 540, healing: 160, energyCost: 55, energyGain: 0, guardPercent: 0.4 },
  },
  {
    id: 'monk-endless-breath', name: 'Endless Breath',
    description: 'Restore your center with every measured exhale.',
    effectText: '+20% healing · +4 ability energy', icon: '🫁', tier: 4,
    kind: 'passive', cost: 1, requiredLevel: 7, parentIds: ['monk-transcendent-palm'],
    passive: { healingBonus: 0.2, energyGain: 4 },
  },
  {
    id: 'monk-rooted-spirit', name: 'Rooted Spirit',
    description: 'Anchor mind and body so neither can be displaced.',
    effectText: '+110 maximum HP · 4% damage resistance', icon: '🌳', tier: 4,
    kind: 'passive', cost: 1, requiredLevel: 7, parentIds: ['monk-transcendent-palm'],
    passive: { maxHp: 110, damageReduction: 0.04 },
  },
  {
    id: 'monk-sunward-kata', name: 'Sunward Kata',
    description: 'Flow through a radiant form that wounds and restores.',
    effectText: '430–540 damage · heal 100 HP · 25% guard · costs 35 energy', icon: '🌅', tier: 5,
    kind: 'active', cost: 2, requiredLevel: 9, parentIds: ['monk-endless-breath'],
    active: { damageMin: 430, damageMax: 540, healing: 100, energyCost: 35, energyGain: 0, guardPercent: 0.25 },
  },
  {
    id: 'monk-empty-mountain', name: 'Empty Mountain',
    description: 'Become still enough that the enemy strikes only emptiness.',
    effectText: '260–340 damage · heal 180 HP · 60% guard · costs 40 energy', icon: '⛰️', tier: 5,
    kind: 'active', cost: 2, requiredLevel: 9, parentIds: ['monk-rooted-spirit'],
    active: { damageMin: 260, damageMax: 340, healing: 180, energyCost: 40, energyGain: 0, guardPercent: 0.6 },
  },
  {
    id: 'monk-meridian-flow', name: 'Meridian Flow',
    description: 'Keep healing energy circulating without interruption.',
    effectText: '+20% healing · +5 ability energy', icon: '🌀', tier: 6,
    kind: 'passive', cost: 1, requiredLevel: 12, parentIds: ['monk-sunward-kata'],
    passive: { healingBonus: 0.2, energyGain: 5 },
  },
  {
    id: 'monk-tempered-soul', name: 'Tempered Soul',
    description: 'Pressure strengthens the calm at your core.',
    effectText: '+100 maximum HP · 5% damage resistance', icon: '🏔️', tier: 6,
    kind: 'passive', cost: 1, requiredLevel: 12, parentIds: ['monk-empty-mountain'],
    passive: { maxHp: 100, damageReduction: 0.05 },
  },
  {
    id: 'monk-enlightened-motion', name: 'Enlightened Motion',
    description: 'Act without hesitation and waste no force.',
    effectText: '+12% attack damage · +6 ability energy', icon: '💫', tier: 7,
    kind: 'passive', cost: 2, requiredLevel: 15, parentIds: ['monk-meridian-flow'],
    passive: { damageBonus: 0.12, energyGain: 6 },
  },
  {
    id: 'monk-sacred-vessel', name: 'Sacred Vessel',
    description: 'Make the body a sanctuary capable of surviving any trial.',
    effectText: '+130 maximum HP · +25% healing', icon: '🏺', tier: 7,
    kind: 'passive', cost: 2, requiredLevel: 15, parentIds: ['monk-tempered-soul'],
    passive: { maxHp: 130, healingBonus: 0.25 },
  },
  {
    id: 'monk-thousand-hand-ascension', name: 'Thousand-Hand Ascension',
    description: 'Manifest perfect balance as an overwhelming final technique.',
    effectText: '760–920 damage · heal 240 HP · 45% guard · costs 75 energy', icon: '🪷', tier: 8,
    kind: 'active', cost: 3, requiredLevel: 20,
    parentIds: ['monk-enlightened-motion', 'monk-sacred-vessel'], requiresAllParents: true,
    active: { damageMin: 760, damageMax: 920, healing: 240, energyCost: 75, energyGain: 0, guardPercent: 0.45 },
  },
];

const rangerSkills: readonly SkillNode[] = [
  {
    id: 'ranger-twin-shot',
    name: 'Twin Shot',
    description: 'Loose two arrows before the enemy can react.',
    effectText: '230–300 damage · +15 energy',
    icon: '🏹',
    tier: 0,
    kind: 'active',
    cost: 0,
    requiredLevel: 1,
    parentIds: [],
    active: { damageMin: 230, damageMax: 300, healing: 0, energyCost: 0, energyGain: 15, guardPercent: 0 },
  },
  {
    id: 'ranger-fleet-foot',
    name: 'Fleet Foot',
    description: 'Stay light enough to slip past the worst attacks.',
    effectText: '6% damage resistance · +35 maximum HP',
    icon: '💨',
    tier: 1,
    kind: 'passive',
    cost: 1,
    requiredLevel: 2,
    parentIds: ['ranger-twin-shot'],
    passive: { damageReduction: 0.06, maxHp: 35 },
  },
  {
    id: 'ranger-eagle-eye',
    name: 'Eagle Eye',
    description: 'Turn distance and patience into precise damage.',
    effectText: '+14% attack damage',
    icon: '🦅',
    tier: 1,
    kind: 'passive',
    cost: 1,
    requiredLevel: 2,
    parentIds: ['ranger-twin-shot'],
    passive: { damageBonus: 0.14 },
  },
  {
    id: 'ranger-momentum',
    name: 'Momentum',
    description: 'Carry the rhythm of movement into every action.',
    effectText: '+15 starting energy · +6 ability energy',
    icon: '⚡',
    tier: 2,
    kind: 'passive',
    cost: 1,
    requiredLevel: 3,
    parentIds: ['ranger-fleet-foot'],
    passive: { startingEnergy: 15, energyGain: 6 },
  },
  {
    id: 'ranger-survivalist',
    name: 'Survivalist',
    description: 'Recover and adapt when the path turns dangerous.',
    effectText: '+75 maximum HP · +20% healing',
    icon: '🌲',
    tier: 2,
    kind: 'passive',
    cost: 1,
    requiredLevel: 3,
    parentIds: ['ranger-eagle-eye'],
    passive: { maxHp: 75, healingBonus: 0.2 },
  },
  {
    id: 'ranger-arrow-storm',
    name: 'Arrow Storm',
    description: 'Fill the arena with a relentless rain of arrows.',
    effectText: '480–610 damage · costs 55 energy',
    icon: '🌧️',
    tier: 3,
    kind: 'active',
    cost: 2,
    requiredLevel: 5,
    parentIds: ['ranger-momentum', 'ranger-survivalist'],
    active: { damageMin: 480, damageMax: 610, healing: 0, energyCost: 55, energyGain: 0, guardPercent: 0 },
  },
  {
    id: 'ranger-trailblazer', name: 'Trailblazer',
    description: 'Always find the route that preserves speed and stamina.',
    effectText: '+10 starting energy · +4 ability energy · 3% resistance', icon: '🧭', tier: 4,
    kind: 'passive', cost: 1, requiredLevel: 7, parentIds: ['ranger-arrow-storm'],
    passive: { startingEnergy: 10, energyGain: 4, damageReduction: 0.03 },
  },
  {
    id: 'ranger-quarry-sense', name: 'Quarry Sense',
    description: 'Read tiny movements until no target can hide a weakness.',
    effectText: '+9% attack damage', icon: '🐾', tier: 4,
    kind: 'passive', cost: 1, requiredLevel: 7, parentIds: ['ranger-arrow-storm'],
    passive: { damageBonus: 0.09 },
  },
  {
    id: 'ranger-ghoststep-volley', name: 'Ghoststep Volley',
    description: 'Evade through the shadows while releasing a close volley.',
    effectText: '440–560 damage · 40% guard · costs 35 energy', icon: '👻', tier: 5,
    kind: 'active', cost: 2, requiredLevel: 9, parentIds: ['ranger-trailblazer'],
    active: { damageMin: 440, damageMax: 560, healing: 0, energyCost: 35, energyGain: 0, guardPercent: 0.4 },
  },
  {
    id: 'ranger-piercing-comet', name: 'Piercing Comet',
    description: 'Launch a single shot with the speed of a falling star.',
    effectText: '600–760 damage · costs 50 energy', icon: '🌠', tier: 5,
    kind: 'active', cost: 2, requiredLevel: 9, parentIds: ['ranger-quarry-sense'],
    active: { damageMin: 600, damageMax: 760, healing: 0, energyCost: 50, energyGain: 0, guardPercent: 0 },
  },
  {
    id: 'ranger-endless-quiver', name: 'Endless Quiver',
    description: 'Recover rhythm and force before the last arrow lands.',
    effectText: '+6% attack damage · +7 ability energy', icon: '🎒', tier: 6,
    kind: 'passive', cost: 1, requiredLevel: 12, parentIds: ['ranger-ghoststep-volley'],
    passive: { damageBonus: 0.06, energyGain: 7 },
  },
  {
    id: 'ranger-wildcraft-remedy', name: 'Wildcraft Remedy',
    description: 'Carry field knowledge that turns setbacks into recovery.',
    effectText: '+90 maximum HP · +25% healing', icon: '🌿', tier: 6,
    kind: 'passive', cost: 1, requiredLevel: 12, parentIds: ['ranger-piercing-comet'],
    passive: { maxHp: 90, healingBonus: 0.25 },
  },
  {
    id: 'ranger-apex-stalker', name: 'Apex Stalker',
    description: 'Move like the hunter nothing else can threaten.',
    effectText: '+13% attack damage · 3% damage resistance', icon: '🐺', tier: 7,
    kind: 'passive', cost: 2, requiredLevel: 15, parentIds: ['ranger-endless-quiver'],
    passive: { damageBonus: 0.13, damageReduction: 0.03 },
  },
  {
    id: 'ranger-horizon-runner', name: 'Horizon Runner',
    description: 'Build a body and cadence made for journeys without end.',
    effectText: '+100 maximum HP · +15 starting energy · +4 ability energy', icon: '🌄', tier: 7,
    kind: 'passive', cost: 2, requiredLevel: 15, parentIds: ['ranger-wildcraft-remedy'],
    passive: { maxHp: 100, startingEnergy: 15, energyGain: 4 },
  },
  {
    id: 'ranger-starfall-dominion', name: 'Starfall Dominion',
    description: 'Claim the entire sky and bring every arrow down at once.',
    effectText: '900–1,100 damage · 20% guard · costs 80 energy', icon: '🌃', tier: 8,
    kind: 'active', cost: 3, requiredLevel: 20,
    parentIds: ['ranger-apex-stalker', 'ranger-horizon-runner'], requiresAllParents: true,
    active: { damageMin: 900, damageMax: 1100, healing: 0, energyCost: 80, energyGain: 0, guardPercent: 0.2 },
  },
];

export const SKILL_TREES: Record<CharacterClassName, readonly SkillNode[]> = {
  Warrior: warriorSkills,
  Scholar: scholarSkills,
  Monk: monkSkills,
  Ranger: rangerSkills,
};

export const SKILL_PATHS: Record<
  CharacterClassName,
  { left: string; right: string }
> = {
  Warrior: { left: 'Vanguard', right: 'Berserker' },
  Scholar: { left: 'Chronomancer', right: 'Arcanist' },
  Monk: { left: 'Radiant Way', right: 'Stone Way' },
  Ranger: { left: 'Pathfinder', right: 'Deadeye' },
};

export const EMPTY_SKILL_BONUSES: SkillBonuses = {
  maxHp: 0,
  damageBonus: 0,
  healingBonus: 0,
  startingEnergy: 0,
  damageReduction: 0,
  energyGain: 0,
};

export function getEffectiveSkillIds(
  characterClass: CharacterClassName,
  savedSkillIds: readonly string[],
) {
  const skills = SKILL_TREES[characterClass];
  const validIds = new Set(skills.map((skill) => skill.id));
  const starterIds = skills.filter((skill) => skill.cost === 0).map((skill) => skill.id);
  return Array.from(
    new Set([...starterIds, ...savedSkillIds.filter((id) => validIds.has(id))]),
  );
}

export function getSkillPoints(level: number, skills: readonly SkillNode[], unlockedIds: readonly string[]) {
  const unlocked = new Set(unlockedIds);
  const spent = skills.reduce(
    (total, skill) => total + (unlocked.has(skill.id) ? skill.cost : 0),
    0,
  );

  return {
    earned: Math.max(0, level - 1),
    spent,
    available: Math.max(0, level - 1 - spent),
  };
}

export function canUnlockSkill(
  skill: SkillNode,
  level: number,
  availablePoints: number,
  unlockedIds: readonly string[],
) {
  if (unlockedIds.includes(skill.id)) return false;
  if (level < skill.requiredLevel || availablePoints < skill.cost) return false;
  if (skill.parentIds.length === 0) return true;
  if (skill.requiresAllParents) {
    return skill.parentIds.every((id) => unlockedIds.includes(id));
  }
  return skill.parentIds.some((id) => unlockedIds.includes(id));
}

export function getSkillBonuses(
  characterClass: CharacterClassName,
  unlockedIds: readonly string[],
) {
  const unlocked = new Set(unlockedIds);
  return SKILL_TREES[characterClass].reduce<SkillBonuses>((bonuses, skill) => {
    if (!unlocked.has(skill.id) || !skill.passive) return bonuses;

    return {
      maxHp: bonuses.maxHp + (skill.passive.maxHp ?? 0),
      damageBonus: bonuses.damageBonus + (skill.passive.damageBonus ?? 0),
      healingBonus: bonuses.healingBonus + (skill.passive.healingBonus ?? 0),
      startingEnergy: bonuses.startingEnergy + (skill.passive.startingEnergy ?? 0),
      damageReduction:
        bonuses.damageReduction + (skill.passive.damageReduction ?? 0),
      energyGain: bonuses.energyGain + (skill.passive.energyGain ?? 0),
    };
  }, { ...EMPTY_SKILL_BONUSES });
}
