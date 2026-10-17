import { describe, expect, it } from '@rstest/core';
import { strToU8, zipSync } from 'fflate';
import { PptxRenderer } from 'pptx-browser';

describe('local PPTX renderer dependency patch', () => {
  it('bounds actual decompression even when the ZIP directory understates its size', async () => {
    const archive = zipSync({
      'ppt/presentation.xml': new Uint8Array(33 * 1024 * 1024),
    });
    const view = new DataView(
      archive.buffer,
      archive.byteOffset,
      archive.byteLength,
    );
    for (let offset = 0; offset < archive.length - 46; offset += 1) {
      if (view.getUint32(offset, true) === 0x02014b50) {
        view.setUint32(offset + 24, 1024, true);
        break;
      }
    }
    const renderer = new PptxRenderer();
    try {
      await expect(renderer.load(archive)).rejects.toThrow(
        /32 MiB expanded limit/,
      );
    } finally {
      renderer.destroy();
    }
  });

  it('rejects oversized archive entries before expanding them', async () => {
    const archive = zipSync(
      { 'ppt/presentation.xml': strToU8('<presentation/>') },
      { level: 0 },
    );
    const view = new DataView(
      archive.buffer,
      archive.byteOffset,
      archive.byteLength,
    );
    for (let offset = 0; offset < archive.length - 46; offset += 1) {
      if (view.getUint32(offset, true) === 0x02014b50) {
        view.setUint32(offset + 24, 33 * 1024 * 1024, true);
        break;
      }
    }
    const renderer = new PptxRenderer();
    try {
      await expect(renderer.load(archive)).rejects.toThrow(
        /expanded archive limit/,
      );
    } finally {
      renderer.destroy();
    }
  });

  it('renders real text runs with their specified color, without loading font stylesheets', async () => {
    const renderer = new PptxRenderer();
    // The renderer is namespace-agnostic. Unprefixed XML avoids happy-dom's
    // incomplete namespace support; real prefixed decks are checked in browsers.
    await renderer.load(
      zipSync(
        {
          'ppt/presentation.xml': strToU8(
            '<presentation><sldSz cx="9144000" cy="5143500"/><sldIdLst><sldId id="s1"/></sldIdLst></presentation>',
          ),
          'ppt/_rels/presentation.xml.rels': strToU8(
            '<Relationships><Relationship Id="s1" Target="slides/slide1.xml"/></Relationships>',
          ),
          'ppt/slides/slide1.xml': strToU8(
            '<sld><cSld><spTree><sp><spPr><xfrm><off x="914400" y="914400"/><ext cx="4572000" cy="914400"/></xfrm></spPr><txBody><bodyPr/><p><pPr/><r><rPr sz="2400"><solidFill><srgbClr val="222222"/></solidFill><latin typeface="Calibri"/></rPr><t>Readable local text</t></r></p></txBody></sp></spTree></cSld></sld>',
          ),
        },
        { level: 0 },
      ),
    );
    const text: { text: string; color: unknown }[] = [];
    const properties: Record<string, unknown> = {};
    const context = new Proxy(properties, {
      get: (target, property: string) => {
        if (property === 'measureText')
          return (value: string) => ({ width: value.length * 10 });
        if (property === 'fillText')
          return (value: string) =>
            text.push({ text: value, color: target.fillStyle });
        return target[property] ?? (() => undefined);
      },
      set: (target, property: string, value: unknown) => {
        target[property] = value;
        return true;
      },
    });
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => context,
    } as unknown as HTMLCanvasElement;
    const before = document.querySelectorAll(
      'link[href*="fonts.googleapis.com"]',
    ).length;
    try {
      await renderer.renderSlide(0, canvas, 800);
      expect(text.map((item) => item.text).join('')).toContain(
        'Readable local text',
      );
      expect(text.every((item) => item.color === 'rgb(34,34,34)')).toBe(true);
      expect(
        document.querySelectorAll('link[href*="fonts.googleapis.com"]').length,
      ).toBe(before);
    } finally {
      renderer.destroy();
    }
  });
});
