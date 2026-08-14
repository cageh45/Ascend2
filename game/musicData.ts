import type { CharacterClassName } from './gameData';
import type { DungeonId } from './dungeonData';
import type { RaidBossId } from './raidData';

export const MUSIC_TRACKS = {
  welcome: track('The First Ascent', require('../assets/music/welcome.m4a')),
  'home-warrior': track('Dawnforged Resolve', require('../assets/music/home-warrior.m4a')),
  'home-scholar': track('The Luminous Archive', require('../assets/music/home-scholar.m4a')),
  'home-monk': track('Breath Above the Clouds', require('../assets/music/home-monk.m4a')),
  'home-ranger': track('Beyond the Green Horizon', require('../assets/music/home-ranger.m4a')),
  'skills-warrior': track('The Tempered Path', require('../assets/music/skills-warrior.m4a')),
  'skills-scholar': track('Constellation of Thought', require('../assets/music/skills-scholar.m4a')),
  'skills-monk': track('Nine Quiet Forms', require('../assets/music/skills-monk.m4a')),
  'skills-ranger': track('Footprints in Starlight', require('../assets/music/skills-ranger.m4a')),
  'party-camp': track('Campfire Covenant', require('../assets/music/party-camp.m4a')),
  sanctuary: track('Sanctuary of Becoming', require('../assets/music/sanctuary.m4a')),
  'raid-hall': track('Before the Gates Open', require('../assets/music/raid-hall.m4a')),
  'dungeon-ember': track('Embers Beneath the Vault', require('../assets/music/dungeon-ember.m4a')),
  'dungeon-verdant': track('Court of Living Thorns', require('../assets/music/dungeon-verdant.m4a')),
  'dungeon-tempest': track('Descent Through Thunder', require('../assets/music/dungeon-tempest.m4a')),
  'dungeon-caldera': track('Heart of the Caldera', require('../assets/music/dungeon-caldera.m4a')),
  'dungeon-lunar': track('Hunt Beneath a Silver Moon', require('../assets/music/dungeon-lunar.m4a')),
  'dungeon-void': track('The Starless Citadel', require('../assets/music/dungeon-void.m4a')),
  'battle-warrior': track('Steel Answers Steel', require('../assets/music/battle-warrior.m4a')),
  'battle-scholar': track('Arcane Counterproof', require('../assets/music/battle-scholar.m4a')),
  'battle-monk': track('Fists in Perfect Balance', require('../assets/music/battle-monk.m4a')),
  'battle-ranger': track('No Arrow Wasted', require('../assets/music/battle-ranger.m4a')),
  'boss-iron': track('Tyrant of the Furnace', require('../assets/music/boss-iron.m4a')),
  'boss-thorn': track('Crown of Briars', require('../assets/music/boss-thorn.m4a')),
  'boss-storm': track('Leviathan Awakens', require('../assets/music/boss-storm.m4a')),
  'boss-ash': track('Colossus of Cinder', require('../assets/music/boss-ash.m4a')),
  'boss-moon': track('The Pale Hunter', require('../assets/music/boss-moon.m4a')),
  'boss-void': track('End of the Ascent', require('../assets/music/boss-void.m4a')),
  victory: track('Ascendant Triumphant', require('../assets/music/victory.m4a')),
  defeat: track('Rise Again', require('../assets/music/defeat.m4a')),
} as const;

export type MusicTrackId = keyof typeof MUSIC_TRACKS;

export const HOME_MUSIC: Record<CharacterClassName, MusicTrackId> = {
  Warrior: 'home-warrior',
  Scholar: 'home-scholar',
  Monk: 'home-monk',
  Ranger: 'home-ranger',
};

export const SKILLS_MUSIC: Record<CharacterClassName, MusicTrackId> = {
  Warrior: 'skills-warrior',
  Scholar: 'skills-scholar',
  Monk: 'skills-monk',
  Ranger: 'skills-ranger',
};

export const BATTLE_MUSIC: Record<CharacterClassName, MusicTrackId> = {
  Warrior: 'battle-warrior',
  Scholar: 'battle-scholar',
  Monk: 'battle-monk',
  Ranger: 'battle-ranger',
};

export const DUNGEON_MUSIC: Record<DungeonId, MusicTrackId> = {
  'ember-vault': 'dungeon-ember',
  'verdant-court': 'dungeon-verdant',
  'tempest-depths': 'dungeon-tempest',
  'caldera-core': 'dungeon-caldera',
  'lunar-hunt': 'dungeon-lunar',
  'void-citadel': 'dungeon-void',
};

export const BOSS_MUSIC: Record<RaidBossId, MusicTrackId> = {
  'iron-wyrm': 'boss-iron',
  'thorn-empress': 'boss-thorn',
  'storm-leviathan': 'boss-storm',
  'ash-colossus': 'boss-ash',
  moonfang: 'boss-moon',
  'void-titan': 'boss-void',
};

function track(title: string, source: number) {
  return { title, source };
}
