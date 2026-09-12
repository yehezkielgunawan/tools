import sharp from 'sharp';

await sharp('public/yehezgun-tools-favicon.svg')
  .resize(512, 512)
  .png()
  .toFile('public/yehezgun-tools-og-logo.png');
