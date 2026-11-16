import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@rstest/core';
import factory from 'libheif-js/libheif-wasm/libheif-bundle.mjs';
import { readHeic } from '../src/tools/image-converter/heicDecoder';
import { inspectConverterInput } from '../src/tools/image-converter/inspectConverterInput';

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
