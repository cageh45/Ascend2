import type { RaidBossId } from './raidData';

export type DungeonId =
  | 'ember-vault'
  | 'verdant-court'
  | 'tempest-depths'
  | 'caldera-core'
  | 'lunar-hunt'
  | 'void-citadel';

export type DungeonEncounter = {
  name: string;
  title: string;
  spriteBossId: RaidBossId;
  hpMultiplier: number;
  attackMultiplier: number;
};

export type DungeonRoom =
  | {
      id: string;
      kind: 'path';
      icon: string;
      name: string;
      description: string;
      actionLabel: string;
    }
  | {
      id: string;
      kind: 'rest';
      icon: string;
      name: string;
      description: string;
    }
  | {
      id: string;
      kind: 'battle';
      icon: string;
      name: string;
      description: string;
      encounter: DungeonEncounter;
    }
  | {
      id: string;
      kind: 'boss';
      icon: string;
      name: string;
      description: string;
    };

export type DungeonDefinition = {
  id: DungeonId;
  name: string;
  subtitle: string;
  bossId: RaidBossId;
  accent: string;
  recommendedLevel: number;
  rooms: readonly DungeonRoom[];
};

export const DUNGEONS: readonly DungeonDefinition[] = [
  dungeon(
    'ember-vault',
    'Ember Vault',
    'A buried forge where every corridor still burns.',
    'iron-wyrm',
    '#FF704D',
    1,
    path('forge-gate', '🔥', 'The Sealed Forge', 'Cross the cooling lava channels and open the ancient forge gate.', 'ENTER THE VAULT'),
    battle('cinder-drake', '🐲', 'Cinder Drake', 'A young drake guards the first descent.', 'Iron Hatchling', 'Keeper of Embers', 'iron-wyrm', 0.18, 0.55),
    path('gearworks', '⚙️', 'The Living Gearworks', 'Ride the turning forge lifts before the mechanism locks again.', 'CROSS THE GEARWORKS'),
    battle('forge-hound', '🐺', 'Forge Hound', 'A furnace-fed guardian tracks the party across the moving machinery.', 'Forge Hound', 'Fang of the Foundry', 'ash-colossus', 0.25, 0.65),
    rest('smith-shrine', '⚒️', 'Smith’s Shrine', 'A quiet anvil radiates enough power to restore the party.'),
    battle('molten-sentinel', '🗿', 'Molten Sentinel', 'The vault’s last construct blocks the tyrant’s chamber.', 'Molten Sentinel', 'Last of the Forgeguard', 'ash-colossus', 0.34, 0.76),
    battle('furnace-knight', 'combat-shield', 'Furnace Knight', 'The Wyrm’s champion seals the throne behind a wall of white-hot steel.', 'Furnace Knight', 'Champion of the Tyrant', 'iron-wyrm', 0.44, 0.88),
    boss('wyrm-throne', '👑', 'The Furnace Throne', 'Defeat the Iron Wyrm and reclaim the vault.'),
  ),
  dungeon(
    'verdant-court',
    'Verdant Court',
    'A living palace grown around a poisoned crown.',
    'thorn-empress',
    '#78D66D',
    5,
    path('rootway', '🌿', 'The Rootway', 'Follow the glowing spores through a maze of moving roots.', 'FOLLOW THE SPORES'),
    battle('briar-knight', '🌹', 'Briar Knight', 'An armored servant rises from the garden wall.', 'Briar Knight', 'Oathbound Bloom', 'thorn-empress', 0.18, 0.55),
    path('thorn-gallery', '🌳', 'The Thorn Gallery', 'Cut through a hall that regrows behind every step.', 'PRESS THROUGH'),
    battle('sporebound-brute', '🗿', 'Sporebound Brute', 'Poisoned roots animate a fallen court guardian.', 'Sporebound Brute', 'The Overgrown', 'ash-colossus', 0.25, 0.65),
    rest('moonwell', '💧', 'Moonlit Well', 'Clear water gathers beneath a break in the canopy.'),
    battle('grove-beast', '🐺', 'Grove Beast', 'A moon-touched hunter stalks the royal path.', 'Grove Beast', 'Fang of the Court', 'moonfang', 0.34, 0.76),
    battle('crowned-treant', 'quest-outdoors', 'Crowned Treant', 'The oldest tree in the court tears free of its roots to defend the throne.', 'Crowned Treant', 'The First Branch', 'thorn-empress', 0.44, 0.88),
    boss('thorn-throne', '👑', 'The Living Throne', 'Challenge the Thorn Empress at the heart of her court.'),
  ),
  dungeon(
    'tempest-depths',
    'Tempest Depths',
    'A drowned temple suspended inside an endless storm.',
    'storm-leviathan',
    '#4CCBFF',
    8,
    path('storm-bridge', '⚡', 'The Broken Causeway', 'Time each crossing between waves of lightning.', 'CROSS THE CAUSEWAY'),
    battle('tide-serpent', '🌊', 'Tide Serpent', 'A smaller stormspawn coils around the temple stairs.', 'Tide Serpent', 'Child of the Squall', 'storm-leviathan', 0.18, 0.55),
    path('flooded-nave', 'dungeon-wave', 'The Flooded Nave', 'Advance between collapsing waves as the drowned bells sound.', 'WADE THROUGH'),
    battle('thunderwing', '🪽', 'Thunderwing', 'A storm-bird dives from the shattered temple roof.', 'Thunderwing', 'Voice of the Gale', 'storm-leviathan', 0.25, 0.65),
    rest('calm-eye', '🌀', 'The Storm’s Eye', 'For one brief moment, the wind and sea become still.'),
    battle('skybreaker-echo', '🪽', 'Skybreaker Echo', 'A spectral guardian tests anyone approaching the abyss.', 'Skybreaker Echo', 'Tempest Memory', 'void-titan', 0.34, 0.76),
    battle('abyssal-siren', 'skill-vortex', 'Abyssal Siren', 'A drowned oracle bends the storm into a final impossible tide.', 'Abyssal Siren', 'Voice Beneath the Waves', 'storm-leviathan', 0.44, 0.88),
    boss('leviathan-eye', '👑', 'The Drowned Spire', 'Climb the final spire and break the Storm Leviathan.'),
  ),
  dungeon(
    'caldera-core',
    'Caldera Core',
    'A mountain dungeon collapsing toward a molten heart.',
    'ash-colossus',
    '#FF8A3D',
    11,
    path('basalt-descent', '⛰️', 'Basalt Descent', 'Descend before the stone path disappears into magma.', 'BEGIN THE DESCENT'),
    battle('slag-wyrm', '🐉', 'Slag Wyrm', 'The tunnel erupts as a plated wyrm surfaces.', 'Slag Wyrm', 'Tunnel Breaker', 'iron-wyrm', 0.18, 0.55),
    path('faultline-run', '🔥', 'Faultline Run', 'Sprint between stable shelves while the mountain tears itself apart.', 'RUN THE FAULTLINE'),
    battle('magma-revenant', '🗿', 'Magma Revenant', 'A fallen delver rises inside a shell of cooling stone.', 'Magma Revenant', 'Buried Fury', 'ash-colossus', 0.25, 0.65),
    rest('ember-sanctum', '🔥', 'Ember Sanctum', 'A protected chamber holds the last clean air in the mountain.'),
    battle('caldera-warden', '🪨', 'Caldera Warden', 'A massive stone guardian awakens at the core gate.', 'Caldera Warden', 'The Unbroken Wall', 'ash-colossus', 0.34, 0.76),
    battle('core-behemoth', 'dungeon-golem', 'Core Behemoth', 'A living fault line rises between the party and the molten heart.', 'Core Behemoth', 'The Walking Eruption', 'ash-colossus', 0.44, 0.88),
    boss('molten-heart', '👑', 'The Molten Heart', 'Stand against the Ash Colossus before the caldera erupts.'),
  ),
  dungeon(
    'lunar-hunt',
    'Lunar Hunt',
    'A silver forest where the hunter can always see you.',
    'moonfang',
    '#A9D8FF',
    14,
    path('silver-trail', '🌙', 'The Silver Trail', 'Track faint pawprints through shifting moonlight.', 'FOLLOW THE TRAIL'),
    battle('pale-stalker', '🐾', 'Pale Stalker', 'A silent predator drops from the frozen branches.', 'Pale Stalker', 'Watcher in White', 'moonfang', 0.18, 0.55),
    path('mirror-grove', 'dungeon-stars', 'The Mirror Grove', 'Choose the true trail among reflections that move on their own.', 'READ THE MOONLIGHT'),
    battle('frost-antler', 'dungeon-paw', 'Frost Antler', 'A towering lunar guardian charges through the mirrored trees.', 'Frost Antler', 'Crown of Winter', 'moonfang', 0.25, 0.65),
    rest('star-clearing', '✨', 'Star Clearing', 'The party finds a protected clearing beneath the constellations.'),
    battle('thorn-huntress', '🏹', 'Thorn Huntress', 'The forest sends its champion to end the hunt.', 'Thorn Huntress', 'Arrow of the Wild', 'thorn-empress', 0.34, 0.76),
    battle('eclipse-warden', 'dungeon-wolf', 'Eclipse Warden', 'Moonfang’s firstborn circles the den beneath a blackening moon.', 'Eclipse Warden', 'First Fang of Night', 'moonfang', 0.44, 0.88),
    boss('moon-den', '👑', 'The Lunar Den', 'Face Moonfang beneath the full moon.'),
  ),
  dungeon(
    'void-citadel',
    'Void Citadel',
    'The final ascent through a fortress outside reality.',
    'void-titan',
    '#A875FF',
    18,
    path('starless-gate', '🌌', 'The Starless Gate', 'Bind the broken runes before the gateway collapses.', 'OPEN THE GATE'),
    battle('rift-guardian', '🔮', 'Rift Guardian', 'An arcane sentinel forms from the fractured doorway.', 'Rift Guardian', 'Keeper of Nothing', 'storm-leviathan', 0.18, 0.55),
    path('inverted-hall', 'skill-vortex', 'The Inverted Hall', 'Walk the ceiling while gravity fractures around the party.', 'CROSS THE INVERSION'),
    battle('star-eater', '🌌', 'Star Eater', 'A lesser void beast consumes the light marking the route.', 'Star Eater', 'Devourer of Beacons', 'void-titan', 0.25, 0.65),
    rest('last-light', '✦', 'The Last Light', 'A lone star offers one final moment of safety.'),
    battle('obsidian-herald', '🗡️', 'Obsidian Herald', 'The Titan’s herald waits at the end of the ascent.', 'Obsidian Herald', 'Voice of the End', 'void-titan', 0.34, 0.76),
    battle('reality-reaver', 'combat-blades', 'Reality Reaver', 'The last guardian cuts pieces out of the arena with every swing.', 'Reality Reaver', 'Blade Outside Time', 'void-titan', 0.44, 0.88),
    boss('titan-sanctum', '👑', 'The End of the Ascent', 'Defeat the Void Titan and complete the citadel.'),
  ),
];

export function getDungeon(id: DungeonId) {
  return DUNGEONS.find((dungeonItem) => dungeonItem.id === id) ?? DUNGEONS[0];
}

export function getDungeonScaling(clearCount: number) {
  const clears = Math.max(0, Math.floor(clearCount));
  const rank = clears + 1;
  const growth = Math.log2(rank);
  return {
    rank,
    hpMultiplier: 1 + growth * 0.22,
    attackMultiplier: 1 + growth * 0.14,
    rewardMultiplier: 1 + growth * 0.2,
  };
}

function dungeon(
  id: DungeonId,
  name: string,
  subtitle: string,
  bossId: RaidBossId,
  accent: string,
  recommendedLevel: number,
  ...rooms: readonly DungeonRoom[]
): DungeonDefinition {
  return { id, name, subtitle, bossId, accent, recommendedLevel, rooms };
}

function path(
  id: string,
  icon: string,
  name: string,
  description: string,
  actionLabel: string,
): DungeonRoom {
  return { id, kind: 'path', icon, name, description, actionLabel };
}

function rest(
  id: string,
  icon: string,
  name: string,
  description: string,
): DungeonRoom {
  return { id, kind: 'rest', icon, name, description };
}

function battle(
  id: string,
  icon: string,
  name: string,
  description: string,
  enemyName: string,
  enemyTitle: string,
  spriteBossId: RaidBossId,
  hpMultiplier: number,
  attackMultiplier: number,
): DungeonRoom {
  return {
    id,
    kind: 'battle',
    icon,
    name,
    description,
    encounter: {
      name: enemyName,
      title: enemyTitle,
      spriteBossId,
      hpMultiplier,
      attackMultiplier,
    },
  };
}

function boss(
  id: string,
  icon: string,
  name: string,
  description: string,
): DungeonRoom {
  return { id, kind: 'boss', icon, name, description };
}
