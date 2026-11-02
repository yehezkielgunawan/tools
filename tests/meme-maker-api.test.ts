import { afterEach, expect, rs, test } from '@rstest/core';
import { fetchMemeTemplates } from '../src/tools/meme-maker/memeApi';

afterEach(() => rs.unstubAllGlobals());

const entry = {
  id: 'drake-hotline-bling',
  slug: 'drake-hotline-bling',
  name: ' Drake Hotline Bling ',
  url: 'https://i.imgflip.com/30b1gx.jpg',
};

function catalog(templates: unknown[], total = templates.length) {
  return new Response(
    JSON.stringify({ success: true, templates, total, page: 1, limit: 24 }),
  );
}

test('normalizes JustMeme templates with two captions and trusted image URLs', async () => {
  rs.stubGlobal(
    'fetch',
    rs
      .fn()
      .mockResolvedValue(
        catalog([
          entry,
          entry,
          { ...entry, id: 'other', url: 'https://evil.example/a.png' },
          { ...entry, url: 'http://i.imgflip.com/a.jpg' },
          { ...entry, url: 'https://user:pass@i.imgflip.com/a.jpg' },
          { ...entry, slug: '../bad' },
          { ...entry, name: '' },
          null,
        ]),
      ),
  );
  expect(await fetchMemeTemplates()).toEqual({
    templates: [
      {
        id: entry.id,
        name: 'Drake Hotline Bling',
        captionCount: 2,
        blankUrl: entry.url,
        sourceUrl: 'https://justmeme.wtf/meme/drake-hotline-bling',
      },
    ],
    total: 8,
    hasMore: false,
  });
});

test('requests one catalog page at a time and forwards cancellation without credentials', async () => {
  const controller = new AbortController();
  const fetchMock = rs.fn().mockResolvedValue(catalog([entry], 100));
  rs.stubGlobal('fetch', fetchMock);
  expect(
    await fetchMemeTemplates({ page: 2, signal: controller.signal }),
  ).toMatchObject({ hasMore: true, total: 100 });
  expect(fetchMock).toHaveBeenCalledWith(
    'https://justmeme.wtf/api/v1/templates?page=2&limit=24',
    expect.objectContaining({ signal: controller.signal, credentials: 'omit' }),
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

test('searches the provider catalog with an encoded trimmed query', async () => {
  const fetchMock = rs.fn().mockResolvedValue(catalog([], 0));
  rs.stubGlobal('fetch', fetchMock);
  expect(await fetchMemeTemplates({ query: ' drake & cats ' })).toEqual({
    templates: [],
    total: 0,
    hasMore: false,
  });
  expect(fetchMock).toHaveBeenCalledWith(
    'https://justmeme.wtf/api/v1/templates/search?q=drake+%26+cats',
    expect.anything(),
  );
});

test('does not send searches shorter than two characters', async () => {
  rs.stubGlobal('fetch', rs.fn());
  expect(await fetchMemeTemplates({ query: ' a ' })).toEqual({
    templates: [],
    total: 0,
    hasMore: false,
  });
  expect(fetch).not.toHaveBeenCalled();
});

test('reports rate limits, HTTP errors, and malformed or unsuccessful catalogs', async () => {
  rs.stubGlobal(
    'fetch',
    rs.fn().mockResolvedValue(new Response('', { status: 429 })),
  );
  await expect(fetchMemeTemplates()).rejects.toThrow(/too many requests/i);
  for (const response of [
    new Response('', { status: 503 }),
    new Response('{}'),
    new Response(JSON.stringify({ success: false, templates: [], total: 0 })),
    new Response(JSON.stringify({ success: true, templates: [], total: -1 })),
  ]) {
    rs.stubGlobal('fetch', rs.fn().mockResolvedValue(response));
    await expect(fetchMemeTemplates()).rejects.toThrow();
  }
});

test('propagates aborts', async () => {
  rs.stubGlobal(
    'fetch',
    rs.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')),
  );
  await expect(
    fetchMemeTemplates({ signal: new AbortController().signal }),
  ).rejects.toMatchObject({ name: 'AbortError' });
});

test('reports catalogs containing only unsupported template images', async () => {
  rs.stubGlobal(
    'fetch',
    rs
      .fn()
      .mockResolvedValue(
        catalog([{ ...entry, url: 'https://evil.example/a.jpg' }]),
      ),
  );
  await expect(fetchMemeTemplates()).rejects.toThrow(/no supported templates/i);
});
