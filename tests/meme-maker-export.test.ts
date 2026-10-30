import { afterEach, expect, rs, test } from '@rstest/core';
import {
  canCopyMeme,
  copyMeme,
  downloadMeme,
} from '../src/tools/meme-maker/memeExport';

afterEach(() => {
  rs.restoreAllMocks();
  rs.unstubAllGlobals();
  rs.useRealTimers();
});

test('downloads a PNG with a safe filename and revokes its object URL', () => {
  rs.useFakeTimers();
  const create = rs
    .spyOn(URL, 'createObjectURL')
    .mockReturnValue('blob:result');
  const revoke = rs.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  let filename = '';
  rs.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    filename = this.download;
    expect(this.href).toBe('blob:result');
  });
  const blob = new Blob(['png'], { type: 'image/png' });
  downloadMeme(blob, 'Buzz / Lightyear?');
  expect(filename).toBe('buzz-lightyear-meme.png');
  expect(create).toHaveBeenCalledWith(blob);
  expect(document.querySelector('a[download]')).toBeNull();
  rs.runAllTimers();
  expect(revoke).toHaveBeenCalledWith('blob:result');
});

test('writes actual PNG image data to the clipboard immediately', async () => {
  const write = rs.fn().mockResolvedValue(undefined);
  let items: Record<string, Blob> | undefined;
  rs.stubGlobal('isSecureContext', true);
  rs.stubGlobal(
    'ClipboardItem',
    class {
      constructor(data: Record<string, Blob>) {
        items = data;
      }
    },
  );
  rs.spyOn(navigator, 'clipboard', 'get').mockReturnValue({
    write,
  } as unknown as Clipboard);
  const blob = new Blob(['png'], { type: 'image/png' });
  expect(canCopyMeme()).toBe(true);
  const pending = copyMeme(blob);
  expect(write).toHaveBeenCalledTimes(1);
  await pending;
  expect(items?.['image/png']).toBe(blob);
});

test('reports unsupported clipboard and permission denial with a download fallback', async () => {
  rs.stubGlobal('isSecureContext', false);
  expect(canCopyMeme()).toBe(false);
  await expect(copyMeme(new Blob())).rejects.toThrow(/download/i);
  rs.stubGlobal('isSecureContext', true);
  rs.stubGlobal('ClipboardItem', class {});
  rs.spyOn(navigator, 'clipboard', 'get').mockReturnValue({
    write: rs.fn().mockRejectedValue(new Error('denied')),
  } as unknown as Clipboard);
  await expect(copyMeme(new Blob())).rejects.toThrow(/download/i);
});
