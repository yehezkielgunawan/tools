import { afterEach, expect, rs, test } from '@rstest/core';
import { initialCard } from '../src/tools/greeting-card/cardModel';
import {
  CardRenderError,
  renderCard,
} from '../src/tools/greeting-card/renderCard';

afterEach(() => rs.restoreAllMocks());

test('posts the full card contract and returns PNG bytes', async () => {
  const fetch = rs.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('png', {
      headers: { 'Content-Type': 'image/png' },
    }),
  );
  const signal = new AbortController().signal;
  const blob = await renderCard(initialCard, signal);
  expect(blob.type).toBe('image/png');
  expect(blob.size).toBe(3);
  expect(fetch).toHaveBeenCalledWith(
    'https://og-image-rev.yehezgun.com/cards/render',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initialCard),
      signal,
      cache: 'no-store',
      credentials: 'omit',
    },
  );
});

test('preserves field-specific API validation errors', async () => {
  rs.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ error: 'Use fewer lines', field: 'message' }),
      { status: 400 },
    ),
  );
  await expect(
    renderCard(initialCard, new AbortController().signal),
  ).rejects.toMatchObject({
    name: 'CardRenderError',
    message: 'Use fewer lines',
    field: 'message',
  });
});

test('reports a useful fallback for non-JSON server failures', async () => {
  rs.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('Bad gateway', { status: 502 }),
  );
  await expect(
    renderCard(initialCard, new AbortController().signal),
  ).rejects.toThrow(CardRenderError);
});

test('rejects unexpected or empty successful responses', async () => {
  const fetch = rs.spyOn(globalThis, 'fetch');
  fetch.mockResolvedValueOnce(
    new Response('<html>error</html>', {
      headers: { 'Content-Type': 'text/html' },
    }),
  );
  await expect(
    renderCard(initialCard, new AbortController().signal),
  ).rejects.toThrow(/PNG/);
  fetch.mockResolvedValueOnce(
    new Response('', { headers: { 'Content-Type': 'image/png' } }),
  );
  await expect(
    renderCard(initialCard, new AbortController().signal),
  ).rejects.toThrow(/empty/i);
});
