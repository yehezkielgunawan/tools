import { afterEach, expect, rs, test } from '@rstest/core';
import {
  fetchMemeTemplates,
  searchMemeTemplates,
} from '../src/tools/meme-maker/memeApi';

afterEach(() => rs.unstubAllGlobals());

const entry = {
  id: 'buzz',
  name: 'Buzz Lightyear',
  lines: 2,
  overlays: 0,
  blank: 'https://api.memegen.link/images/buzz.jpg',
  source: 'https://knowyourmeme.com/memes/toy-story',
};

test('normalizes valid templates to blank static PNGs and drops unusable entries', async () => {
  rs.stubGlobal(
    'fetch',
    rs
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify([
            entry,
            { ...entry, id: 'bad', lines: -1 },
            { ...entry, id: 'overlay', overlays: 1 },
            { ...entry, blank: 'http://api.memegen.link/images/buzz.jpg' },
            { ...entry, blank: 'https://untrusted.example/image.png' },
            { ...entry, id: '../bad' },
            null,
          ]),
        ),
      ),
  );
  expect(await fetchMemeTemplates()).toEqual([
    {
      id: 'buzz',
      name: 'Buzz Lightyear',
      captionCount: 2,
      blankUrl: 'https://api.memegen.link/images/buzz.png',
      sourceUrl: entry.source,
    },
  ]);
});

test('searches the loaded catalog locally without case or surrounding-space sensitivity', () => {
  const templates = [
    {
      id: 'buzz',
      name: 'Buzz Lightyear',
      captionCount: 2,
      blankUrl: 'https://api.memegen.link/images/buzz.png',
    },
  ];
  expect(searchMemeTemplates(templates, ' LIGHT ')).toEqual(templates);
  expect(searchMemeTemplates(templates, '')).toEqual(templates);
  expect(searchMemeTemplates(templates, 'nope')).toEqual([]);
});

test('reports HTTP and invalid catalog failures', async () => {
  rs.stubGlobal(
    'fetch',
    rs.fn().mockResolvedValue(new Response('', { status: 503 })),
  );
  await expect(fetchMemeTemplates()).rejects.toThrow(/templates/i);
  rs.stubGlobal('fetch', rs.fn().mockResolvedValue(new Response('{}')));
  await expect(fetchMemeTemplates()).rejects.toThrow(/catalog/i);
});

test('passes cancellation to fetch and propagates aborts', async () => {
  const controller = new AbortController();
  controller.abort();
  const fetchMock = rs
    .fn()
    .mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
  rs.stubGlobal('fetch', fetchMock);
  await expect(fetchMemeTemplates(controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.memegen.link/templates/',
    expect.objectContaining({ signal: controller.signal }),
  );
});
