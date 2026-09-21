import sharp from 'sharp';

const source = 'public/yehezgun-tools-favicon.svg';

await Promise.all([
  sharp(source).resize(192, 192).png().toFile('public/pwa-icon-192.png'),
  sharp(source).resize(512, 512).png().toFile('public/pwa-icon-512.png'),
  sharp(source).resize(180, 180).png().toFile('public/apple-touch-icon.png'),
  sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: '#0c1d3b',
    },
  })
    .composite([
      {
        input: await sharp(source).resize(360, 360).png().toBuffer(),
        gravity: 'center',
      },
    ])
    .png()
    .toFile('public/pwa-maskable-512.png'),
]);
