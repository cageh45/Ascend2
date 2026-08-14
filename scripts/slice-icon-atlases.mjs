import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const atlasDirectory = path.join(process.cwd(), 'assets', 'sprites', 'icons', 'atlases');
const outputDirectory = path.join(process.cwd(), 'assets', 'sprites', 'icons', 'generated');

const atlases = [
  ['classes-stats-v1.png', 4, 3, [
    'class-warrior', 'class-scholar', 'class-monk', 'class-ranger',
    'stat-strength', 'stat-intelligence', 'stat-mindfulness', 'stat-endurance',
    'stat-vitality', 'progress-xp', 'resource-energy', 'resource-healing',
  ]],
  ['fitness-quests-v1.png', 4, 4, [
    'quest-steps', 'quest-workout', 'quest-reading', 'quest-meditation',
    'quest-sleep', 'quest-water', 'quest-screen-free', 'quest-training',
    'quest-squat', 'quest-plank', 'quest-stairs', 'quest-mobility',
    'quest-meal', 'quest-notes', 'quest-puzzle', 'quest-timer',
  ]],
  ['mindful-quests-v1.png', 4, 4, [
    'quest-map', 'quest-breath', 'quest-gratitude', 'quest-tea',
    'quest-journal', 'quest-kindness', 'quest-mountain', 'quest-run',
    'quest-outdoors', 'quest-compass', 'quest-stretch', 'quest-bike',
    'quest-scout', 'quest-cards', 'quest-language', 'quest-idea',
  ]],
  ['combat-skills-v1.png', 4, 4, [
    'combat-blades', 'combat-impact', 'combat-shield', 'combat-arcane',
    'combat-fist', 'combat-dragon', 'combat-bow', 'combat-target',
    'combat-leaf', 'combat-fire', 'combat-crown', 'combat-fortress',
    'combat-blood', 'combat-aegis', 'combat-axe', 'combat-drum',
  ]],
  ['advanced-skills-v1.png', 4, 4, [
    'skill-banner', 'skill-volcano', 'skill-geometry', 'skill-comet',
    'skill-temple', 'skill-helix', 'skill-chain', 'skill-infinity',
    'skill-eye', 'skill-palm', 'skill-lungs', 'skill-sunrise',
    'skill-vortex', 'status-trophy', 'skill-ghost', 'skill-starfall',
  ]],
  ['dungeon-status-v1.png', 4, 4, [
    'dungeon-forge', 'dungeon-hatchling', 'dungeon-anvil', 'dungeon-golem',
    'dungeon-rose', 'dungeon-wolf', 'dungeon-wave', 'dungeon-wing',
    'dungeon-paw', 'dungeon-stars', 'dungeon-dagger', 'dungeon-map',
    'status-lock', 'status-warning', 'status-victory', 'status-defeat',
  ]],
];

fs.mkdirSync(outputDirectory, { recursive: true });

for (const [filename, columns, rows, names] of atlases) {
  const input = path.join(atlasDirectory, filename);
  const metadata = await sharp(input).metadata();
  if (!metadata.width || !metadata.height || names.length !== columns * rows) {
    throw new Error(`Invalid atlas configuration for ${filename}`);
  }

  for (let index = 0; index < names.length; index += 1) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = Math.round((column * metadata.width) / columns);
    const top = Math.round((row * metadata.height) / rows);
    const right = Math.round(((column + 1) * metadata.width) / columns);
    const bottom = Math.round(((row + 1) * metadata.height) / rows);
    const target = path.join(outputDirectory, `${names[index]}.png`);

    const croppedBuffer = await sharp(input)
      .extract({
        left,
        top,
        width: right - left,
        height: bottom - top,
      })
      .png()
      .toBuffer();
    const trimmedBuffer = await sharp(croppedBuffer)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const fittedBuffer = await sharp(trimmedBuffer)
      .resize({ width: 172, height: 172, fit: 'inside' })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    const fitted = await sharp(fittedBuffer).metadata();

    await sharp({
      create: {
        width: 192,
        height: 192,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{
        input: fittedBuffer,
        left: Math.round((192 - (fitted.width ?? 172)) / 2),
        top: Math.round((192 - (fitted.height ?? 172)) / 2),
      }])
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(target);
  }
}

console.log(`Wrote ${atlases.reduce((sum, atlas) => sum + atlas[3].length, 0)} custom icon sprites.`);
