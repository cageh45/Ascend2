import { readdir, rename } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = path.resolve(import.meta.dirname, '..');
const spriteRoot = path.join(projectRoot, 'assets', 'sprites');
const tabRoot = path.join(spriteRoot, 'tabs');

async function pngFiles(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.png'))
    .map((entry) => path.join(directory, entry.name));
}

async function replacePng(file, transform) {
  const temporaryFile = `${file}.optimized`;
  await transform(sharp(file, { failOn: 'error' }))
    .png({
      adaptiveFiltering: true,
      compressionLevel: 9,
      effort: 10,
      palette: true,
      quality: 92,
    })
    .toFile(temporaryFile);
  await rename(temporaryFile, file);
}

const sprites = await pngFiles(spriteRoot);
const tabs = await pngFiles(tabRoot);

await Promise.all(
  sprites.map((file) =>
    replacePng(file, (image) =>
      image.resize({
        width: 768,
        height: 1024,
        fit: 'inside',
        withoutEnlargement: true,
      }),
    ),
  ),
);

await Promise.all(
  tabs.map((file) =>
    replacePng(file, (image) =>
      image.resize({
        width: 192,
        height: 192,
        fit: 'inside',
        withoutEnlargement: true,
      }),
    ),
  ),
);

await replacePng(
  path.join(projectRoot, 'assets', 'ascend-app-icon-v1.png'),
  (image) =>
    image
      .resize(1024, 1024, { fit: 'cover' })
      .flatten({ background: '#02051A' }),
);

console.log(`Optimized ${sprites.length} sprites and ${tabs.length} tab icons.`);
