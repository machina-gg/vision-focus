/**
 * Background image optimization script
 *
 * Resizes all background images to 1920x1080 and converts to WebP format.
 * Requires: npm install sharp (installed in a temp directory to avoid project conflicts)
 *
 * Usage: node scripts/optimize-images.mjs
 */

import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BACKGROUNDS_DIR = join(
  __dirname,
  '..',
  'assets',
  'images',
  'backgrounds'
);
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const WEBP_QUALITY = 82;

async function loadSharp() {
  // Support loading sharp from external node_modules via SHARP_PATH env var
  const sharpPath = process.env.SHARP_PATH;
  try {
    if (sharpPath) {
      const { createRequire } = await import('module');
      const require = createRequire(join(sharpPath, 'package.json'));
      return require('sharp');
    }
    const sharp = await import('sharp');
    return sharp.default;
  } catch {
    console.error('sharp is not installed. Install it first:');
    console.error('  npm install --no-save sharp');
    console.error(
      'Or set SHARP_PATH to a directory containing sharp in node_modules.'
    );
    process.exit(1);
  }
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function optimizeImage(sharp, filePath) {
  const name = basename(filePath, extname(filePath));
  const outputPath = join(BACKGROUNDS_DIR, `${name}.webp`);
  const originalSize = statSync(filePath).size;

  const metadata = await sharp(filePath).metadata();
  const originalWidth = metadata.width;
  const originalHeight = metadata.height;

  await sharp(filePath)
    .resize(MAX_WIDTH, MAX_HEIGHT, {
      fit: 'cover',
      position: 'center'
    })
    .webp({ quality: WEBP_QUALITY })
    .toFile(outputPath);

  const optimizedSize = statSync(outputPath).size;
  const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);

  console.log(
    `  ${name}: ${originalWidth}x${originalHeight} → ${MAX_WIDTH}x${MAX_HEIGHT} | ` +
      `${formatSize(originalSize)} → ${formatSize(optimizedSize)} (${reduction}% reduction)`
  );

  return { originalSize, optimizedSize };
}

async function main() {
  const sharp = await loadSharp();

  console.log('Background image optimization');
  console.log(`  Source: ${BACKGROUNDS_DIR}`);
  console.log(
    `  Target: ${MAX_WIDTH}x${MAX_HEIGHT} WebP @ quality ${WEBP_QUALITY}`
  );
  console.log('');

  const jpgFiles = readdirSync(BACKGROUNDS_DIR)
    .filter((f) => f.endsWith('.jpg') || f.endsWith('.jpeg'))
    .map((f) => join(BACKGROUNDS_DIR, f));

  if (jpgFiles.length === 0) {
    console.log('No JPG files found to optimize.');
    return;
  }

  console.log(`Processing ${jpgFiles.length} images...`);

  let totalOriginal = 0;
  let totalOptimized = 0;

  for (const file of jpgFiles) {
    const { originalSize, optimizedSize } = await optimizeImage(sharp, file);
    totalOriginal += originalSize;
    totalOptimized += optimizedSize;
  }

  console.log('');
  console.log('Summary:');
  console.log(
    `  Total: ${formatSize(totalOriginal)} → ${formatSize(totalOptimized)}`
  );
  console.log(
    `  Reduction: ${((1 - totalOptimized / totalOriginal) * 100).toFixed(1)}%`
  );
  console.log('');
  console.log(
    'Done! Old JPG files are preserved. Remove them manually after verification:'
  );
  console.log(`  rm ${BACKGROUNDS_DIR}/*.jpg`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
