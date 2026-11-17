# Image Converter fixtures

These small synthetic fixtures contain no personal photos.

- `artwork.svg`: red-to-blue gradient clipped to leave a transparent right edge.
- `transparent.png`: rasterization of that SVG using the existing Sharp dependency.
- `oriented.jpg`: the same image flattened onto white, with EXIF orientation 6.
- `photo.heic`: the PNG encoded as HEIC using macOS `sips`.
- `rotated.heic`: the same HEIC with a 90-degree container rotation (`irot`).
- `24mp.heic`: synthetic gradient/circle, 5712 × 4284 (24.47 MP).
- `48mp.heic`: synthetic gradient/circle, 8064 × 6048 (48.77 MP).

Regenerate the binary fixtures from the repository root:

```sh
node --input-type=module -e 'import sharp from "sharp"; const dir="tests/fixtures/image-converter/"; await sharp(dir+"artwork.svg").png().toFile(dir+"transparent.png"); await sharp(dir+"artwork.svg").flatten({background:"#fff"}).withMetadata({orientation:6}).jpeg().toFile(dir+"oriented.jpg");'
rtk proxy sips -s format heic tests/fixtures/image-converter/transparent.png --out tests/fixtures/image-converter/photo.heic
rtk proxy sips --rotate 90 tests/fixtures/image-converter/photo.heic --out tests/fixtures/image-converter/rotated.heic
```

The JPEG and rotated HEIC's displayed dimensions are 32 × 48; the PNG, SVG, and original HEIC are
48 × 32. These fixtures supplement, not replace, testing real iPhone
portrait photos, HDR inputs, and multi-image containers before release.

Regenerate the large fixtures on macOS (Sharp is already a development dependency):

```sh
node --input-type=module <<'JS'
import sharp from 'sharp';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
for (const [w, h, name] of [[5712, 4284, '24mp'], [8064, 6048, '48mp']]) {
  const png = join(tmpdir(), `yehezgun-${name}-fixture.png`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g"><stop stop-color="#d20"/><stop offset="1" stop-color="#06d"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${w/2}" cy="${h/2}" r="${h/3}" fill="#198"/></svg>`;
  await sharp(Buffer.from(svg)).png().toFile(png);
  execFileSync('rtk', ['proxy', 'sips', '-s', 'format', 'heic', png, '--out', `tests/fixtures/image-converter/${name}.heic`]);
}
JS
```
