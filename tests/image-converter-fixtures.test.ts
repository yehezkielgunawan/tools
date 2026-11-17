import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@rstest/core';
import factory from 'libheif-js/libheif-wasm/libheif-bundle.mjs';
import { inspectConverterInput } from '../src/tools/image-converter/inspectConverterInput';
import { readHeic } from '../src/tools/image-shared/heic/decoder';

test('decodes a real HEIC fixture with libheif, not a mocked decoder', async () => {
  const bytes = readFileSync(
    resolve('tests/fixtures/image-converter/photo.heic'),
  );
  const buffer = Uint8Array.from(bytes).buffer;
  const library = await factory();
  const result = await readHeic(library, buffer, 'decode');
  expect(result).toMatchObject({ width: 48, height: 32 });
  expect(result.pixels?.byteLength).toBe(48 * 32 * 4);
  expect(
    new Uint8Array(result.pixels ?? new ArrayBuffer(0)).some(
      (value) => value > 0,
    ),
  ).toBe(true);
});

test('applies the HEIF container rotation in a real HEIC fixture', async () => {
  const bytes = readFileSync(
    resolve('tests/fixtures/image-converter/rotated.heic'),
  );
  const library = await factory();
  const result = await readHeic(
    library,
    Uint8Array.from(bytes).buffer,
    'decode',
  );
  expect(result).toMatchObject({ width: 32, height: 48 });
  expect(result.pixels?.byteLength).toBe(32 * 48 * 4);
});

test('inspects real JPEG EXIF orientation and transparent PNG dimensions', async () => {
  for (const [name, type, width, height] of [
    ['oriented.jpg', 'image/jpeg', 32, 48],
    ['transparent.png', 'image/png', 48, 32],
  ] as const) {
    const bytes = readFileSync(
      resolve(`tests/fixtures/image-converter/${name}`),
    );
    const file = new File([Uint8Array.from(bytes)], name, { type });
    await expect(inspectConverterInput(file)).resolves.toMatchObject({
      width,
      height,
    });
  }
});

for (const [name, width, height] of [
  ['24mp.heic', 5712, 4284],
  ['48mp.heic', 8064, 6048],
] as const) {
  test(`decodes and downsizes ${name} without returning full-resolution pixels`, {
    timeout: 30_000,
  }, async () => {
    const bytes = readFileSync(
      resolve(`tests/fixtures/image-converter/${name}`),
    );
    const library = await factory();
    const input = Uint8Array.from(bytes).buffer;
    await expect(readHeic(library, input, 'inspect')).resolves.toMatchObject({
      width,
      height,
    });
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await readHeic(library, input, 'decode', 2048);
      expect(result).toMatchObject({
        width: 2048,
        height: 1536,
        sourceWidth: width,
        sourceHeight: height,
      });
      expect(result.pixels?.byteLength).toBe(2048 * 1536 * 4);
      const pixels = new Uint8Array(result.pixels ?? new ArrayBuffer(0));
      // The generated center circle is green, so this checks actual image content
      // rather than accepting a blank buffer with the right dimensions.
      const center = (768 * 2048 + 1024) * 4;
      expect(pixels[center + 1]).toBeGreaterThan(pixels[center]);
      expect(pixels[center + 1]).toBeGreaterThan(pixels[center + 2]);
      expect(pixels[center + 3]).toBe(255);
    }
  });
}
