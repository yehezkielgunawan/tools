import { expect, test } from '@rstest/core';
import { inspectConverterInput } from '../src/tools/image-converter/inspectConverterInput';
import { prepareSvg } from '../src/tools/image-converter/prepareSvg';

function png(width = 640, height = 480, type = ''): File {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  bytes.set([73, 72, 68, 82], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return new File([bytes], 'photo.png', { type });
}

function svg(body: string, attributes = 'viewBox="0 0 640 480"'): File {
  return new File(
    [`<svg xmlns="http://www.w3.org/2000/svg" ${attributes}>${body}</svg>`],
    'art.svg',
    { type: 'image/svg+xml' },
  );
}

test('detects raster contents without trusting filename or a missing MIME type', async () => {
  await expect(inspectConverterInput(png())).resolves.toEqual({
    format: 'png',
    width: 640,
    height: 480,
  });
  await expect(inspectConverterInput(png(1, 1, 'image/jpeg'))).rejects.toThrow(
    /match/i,
  );
});

test('rejects empty, oversized, unsupported, and over-budget inputs', async () => {
  await expect(
    inspectConverterInput(new File([], 'empty.jpg')),
  ).rejects.toThrow(/empty/i);
  const large = png();
  Object.defineProperty(large, 'size', { value: 32 * 1024 * 1024 + 1 });
  await expect(inspectConverterInput(large)).rejects.toThrow(/32 MB/);
  await expect(
    inspectConverterInput(new File(['not a photo'], 'photo.heic')),
  ).rejects.toThrow(/supported|choose/i);
  await expect(inspectConverterInput(png(5000, 5000))).rejects.toThrow(
    /24 megapixel/i,
  );
});

test('validates self-contained SVGs and derives dimensions from viewBox', async () => {
  const file = svg(
    '<defs><linearGradient id="paint"><stop offset="0" stop-color="red"/></linearGradient></defs><rect width="640" height="480" fill="url(#paint)"/>',
  );
  await expect(inspectConverterInput(file)).resolves.toEqual({
    format: 'svg',
    width: 640,
    height: 480,
  });
  const prepared = await prepareSvg(file);
  expect(prepared.blob.type).toBe('image/svg+xml');
  expect(await prepared.blob.text()).toContain('linearGradient');
});

test('SVG dimensions honor explicit size and proportional viewBox sizing', async () => {
  await expect(
    prepareSvg(svg('', 'width="320" viewBox="0 0 640 480"')),
  ).resolves.toMatchObject({ width: 320, height: 240 });
  await expect(
    prepareSvg(svg('', 'width="120" height="80"')),
  ).resolves.toMatchObject({ width: 120, height: 80 });
  await expect(prepareSvg(svg('', ''))).rejects.toThrow(/dimensions|viewBox/i);
  await expect(prepareSvg(svg('', 'width="0" height="80"'))).rejects.toThrow();
});

for (const [name, content] of [
  ['script', '<script>alert(1)</script>'],
  ['event handler', '<rect onload="alert(1)"/>'],
  ['external image', '<image href="https://example.com/track.png"/>'],
  ['embedded document', '<foreignObject><div>hello</div></foreignObject>'],
  ['CSS import', '<style>@import "https://example.com/style.css";</style>'],
  ['CSS resource', '<rect style="fill:url(https://example.com/paint)"/>'],
  [
    'escaped CSS resource',
    '<rect style="fill:u\\72l(https://example.com/paint)"/>',
  ],
  ['external paint', '<rect fill="url(https://example.com/paint)"/>'],
  ['data URL', '<image href="data:image/svg+xml,anything"/>'],
  ['recursive use', '<use id="loop" href="#loop"/>'],
  ['animation', '<animate attributeName="href" to="https://example.com"/>'],
  [
    'processing instruction',
    '<?xml-stylesheet href="https://example.com/style.css"?>',
  ],
  [
    'foreign namespace',
    '<g xmlns="http://www.w3.org/1999/xhtml"><script/></g>',
  ],
] as const) {
  test(`rejects SVG ${name}`, async () => {
    await expect(prepareSvg(svg(content))).rejects.toThrow(/SVG/i);
  });
}

test('rejects XML entities, malformed XML, and excessive SVG dimensions', async () => {
  await expect(
    prepareSvg(
      new File(
        ['<!DOCTYPE svg [<!ENTITY x "x">]><svg>&x;</svg>'],
        'entity.svg',
      ),
    ),
  ).rejects.toThrow(/SVG/i);
  await expect(
    prepareSvg(new File(['<svg><rect></svg>'], 'broken.svg')),
  ).rejects.toThrow(/SVG/i);
  await expect(prepareSvg(svg('', 'viewBox="0 0 5000 5000"'))).rejects.toThrow(
    /24 megapixel/i,
  );
});
