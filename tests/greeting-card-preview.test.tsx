import { afterEach, beforeEach, expect, rs, test } from '@rstest/core';
import { act, renderHook } from '@testing-library/react';
import { initialCard } from '../src/tools/greeting-card/cardModel';
import * as originalRenderModule from '../src/tools/greeting-card/renderCard' with {
  rstest: 'importActual',
};
import {
  CardRenderError,
  renderCard,
} from '../src/tools/greeting-card/renderCard';
import { useCardPreview } from '../src/tools/greeting-card/useCardPreview';

rs.mock('../src/tools/greeting-card/renderCard', () => ({
  ...originalRenderModule,
  renderCard: rs.fn(),
}));

const renderImage = rs.mocked(renderCard);
const png = new Blob(['png'], { type: 'image/png' });

beforeEach(() => {
  rs.useFakeTimers();
  renderImage.mockReset();
  renderImage.mockResolvedValue(png);
  let index = 0;
  rs.spyOn(URL, 'createObjectURL').mockImplementation(
    () => `blob:card-${++index}`,
  );
  rs.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  rs.useRealTimers();
  rs.restoreAllMocks();
});

async function advance(milliseconds = 400) {
  await act(async () => {
    await rs.advanceTimersByTimeAsync(milliseconds);
  });
}

test('debounces edits and makes only the current preview downloadable', async () => {
  const { result, rerender } = renderHook((card) => useCardPreview(card), {
    initialProps: initialCard,
  });
  await advance(399);
  expect(renderImage).not.toHaveBeenCalled();
  rerender({ ...initialCard, heading: 'Hello Alex!' });
  await advance(399);
  expect(renderImage).not.toHaveBeenCalled();
  expect(result.current.ready).toBe(false);
  await advance(1);
  expect(renderImage).toHaveBeenCalledTimes(1);
  expect(result.current.ready).toBe(true);
  expect(result.current.preview?.url).toBe('blob:card-1');
  rerender({ ...initialCard, heading: 'Another greeting' });
  expect(result.current.ready).toBe(false);
  expect(result.current.preview?.url).toBe('blob:card-1');
});

test('aborts superseded requests and ignores responses even if they finish late', async () => {
  let finish!: (value: Blob) => void;
  renderImage.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { result, rerender } = renderHook((card) => useCardPreview(card), {
    initialProps: initialCard,
  });
  await advance();
  const signal = renderImage.mock.calls[0]?.[1];
  rerender({ ...initialCard, heading: 'New heading' });
  expect(signal?.aborted).toBe(true);
  await advance();
  expect(result.current.preview?.url).toBe('blob:card-1');
  await act(async () => {
    finish(png);
  });
  expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  expect(result.current.ready).toBe(true);
});

test('keeps the previous image on failure, associates API errors, and allows retry', async () => {
  const { result, rerender } = renderHook((card) => useCardPreview(card), {
    initialProps: initialCard,
  });
  await advance();
  renderImage.mockRejectedValueOnce(
    new CardRenderError('Use fewer lines', 'message'),
  );
  rerender({ ...initialCard, message: 'A new message' });
  await advance();
  expect(result.current.preview?.url).toBe('blob:card-1');
  expect(result.current.ready).toBe(false);
  expect(result.current.error).toMatchObject({
    message: 'Use fewer lines',
    field: 'message',
  });
  act(() => result.current.retry());
  await advance();
  expect(result.current.ready).toBe(true);
  expect(result.current.error).toBeNull();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:card-1');
});

test('does not render invalid inputs and releases the last image on unmount', async () => {
  const { result, rerender, unmount } = renderHook(
    (card) => useCardPreview(card),
    { initialProps: initialCard },
  );
  await advance();
  rerender({ ...initialCard, message: ' ' });
  await advance();
  expect(renderImage).toHaveBeenCalledTimes(1);
  expect(result.current.ready).toBe(false);
  expect(result.current.errors.message).toBe('Enter a message.');
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:card-1');
});

test('ignores a response that arrives after unmount', async () => {
  let finish!: (value: Blob) => void;
  renderImage.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { unmount } = renderHook(() => useCardPreview(initialCard));
  await advance();
  unmount();
  expect(renderImage.mock.calls[0]?.[1].aborted).toBe(true);
  await act(async () => {
    finish(png);
  });
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test('times out a stalled request with retryable feedback', async () => {
  renderImage.mockImplementationOnce(
    (_card, signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () =>
          reject(new DOMException('Aborted', 'AbortError')),
        );
      }),
  );
  const { result } = renderHook(() => useCardPreview(initialCard));
  await advance();
  await advance(20_000);
  expect(result.current.error?.message).toMatch(/too long/i);
  expect(result.current.ready).toBe(false);
  act(() => result.current.retry());
  await advance();
  expect(result.current.ready).toBe(true);
});
