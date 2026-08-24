// pwa-icons-generator.mjs
// PWA Icons Generator - SVG to PNG using canvas/jimp fallback
// Run: node pwa-icons-generator.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
  console.log('📁 Created icons directory');
}

// Try to use sharp for SVG→PNG conversion
async function generateWithSharp() {
  const sharp = (await import('sharp')).default;
  const svgBuffer = readFileSync(path.join(__dirname, 'public', 'favicon.svg'));

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated icon-${size}x${size}.png`);
  }
}

try {
  console.log('🔄 Generating PWA icons with sharp...');
  await generateWithSharp();
  console.log('\n🎉 All PWA icons generated successfully in public/icons/');
} catch (err) {
  console.error('❌ sharp failed:', err.message);
  console.log('\n📌 Please install sharp manually:');
  console.log('   npm install sharp --save-dev');
  console.log('   then run: node pwa-icons-generator.mjs');
  process.exit(1);
}
