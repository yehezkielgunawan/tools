import { afterEach, beforeEach, expect, rs, test } from '@rstest/core';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '../src/app/router';
import { getPageMetadata } from '../src/seo/pageMetadata';
import MemeMaker from '../src/tools/meme-maker/MemeMaker';
import { prepareMemeImage } from '../src/tools/meme-maker/prepareMemeImage';

rs.mock('../src/tools/meme-maker/prepareMemeImage', () => ({
  prepareMemeImage: rs.fn(),
}));

function prepared() {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  return { canvas, width: 640, height: 480, release: rs.fn() };
}
function mount() {
  return render(
    <MemoryRouter>
      <MemeMaker />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  rs.stubGlobal(
    'fetch',
    rs.fn().mockImplementation(
      async (input: string) =>
        new Response(
          JSON.stringify({
            success: true,
            total: 2,
            templates: [
              {
                id: 'buzz',
                name: 'Buzz Lightyear',
                slug: 'buzz',
                url: 'https://i.imgflip.com/buzz.jpg',
              },
              {
                id: 'aag',
                name: 'Ancient Aliens',
                slug: 'aag',
                url: 'https://i.imgflip.com/aag.jpg',
              },
            ].filter(
              (item) =>
                !input.includes('/search?') ||
                item.name
                  .toLowerCase()
                  .includes(
                    new URL(input).searchParams.get('q')?.toLowerCase() ?? '',
                  ),
            ),
          }),
        ),
    ),
  );
  rs.mocked(prepareMemeImage)
    .mockReset()
    .mockImplementation(async () => prepared());
  rs.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: rs.fn(),
    drawImage: rs.fn(),
    save: rs.fn(),
    restore: rs.fn(),
    fillText: rs.fn(),
    strokeText: rs.fn(),
    measureText: (text: string) => ({ width: text.length * 10 }),
  } as unknown as CanvasRenderingContext2D);
  rs.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
    (callback) => callback(new Blob(['png'], { type: 'image/png' })),
  );
});
afterEach(() => {
  rs.restoreAllMocks();
  rs.unstubAllGlobals();
});

test('browses and searches JustMeme with clear privacy information', async () => {
  mount();
  expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();
  await screen.findByRole('button', { name: 'Use Buzz Lightyear' });
  fireEvent.change(
    screen.getByRole('searchbox', { name: /search templates/i }),
    { target: { value: 'ALIENS' } },
  );
  await screen.findByRole('button', { name: 'Use Ancient Aliens' });
  expect(
    screen.queryByRole('button', { name: 'Use Buzz Lightyear' }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'not found' },
  });
  await screen.findByText(/no templates match/i);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(screen.getByRole('link', { name: 'justmeme.wtf' })).toHaveAttribute(
    'href',
    'https://justmeme.wtf/',
  );
  expect(
    screen.getByText(/your captions and finished memes stay on your device/i),
  ).toBeInTheDocument();
});

test('loads more pages without duplicates and retries failed pages without losing the catalog', async () => {
  const fetchMock = rs.mocked(fetch);
  fetchMock.mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        success: true,
        total: 48,
        templates: [
          {
            id: 'buzz',
            slug: 'buzz',
            name: 'Buzz Lightyear',
            url: 'https://i.imgflip.com/buzz.jpg',
          },
        ],
      }),
    ),
  );
  mount();
  await screen.findByRole('button', { name: 'Use Buzz Lightyear' });
  fetchMock.mockRejectedValueOnce(new Error('Offline'));
  fireEvent.click(screen.getByRole('button', { name: /show more templates/i }));
  await screen.findByRole('alert');
  expect(
    screen.getByRole('button', { name: 'Use Buzz Lightyear' }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /retry templates/i }));
  await screen.findByRole('button', { name: 'Use Ancient Aliens' });
  expect(
    screen.getAllByRole('button', { name: 'Use Buzz Lightyear' }),
  ).toHaveLength(1);
  expect(fetchMock).toHaveBeenLastCalledWith(
    'https://justmeme.wtf/api/v1/templates?page=2&limit=24',
    expect.anything(),
  );
});

test('debounces searches, skips one-character queries, and restores browsing when cleared', async () => {
  mount();
  await screen.findByRole('button', { name: 'Use Buzz Lightyear' });
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'a' } });
  expect(
    await screen.findByText(/enter at least two characters/i),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'al' } });
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'aliens' },
  });
  expect(fetch).toHaveBeenCalledTimes(1);
  await screen.findByRole('button', { name: 'Use Ancient Aliens' });
  expect(fetch).toHaveBeenCalledTimes(2);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
  await screen.findByRole('button', { name: 'Use Buzz Lightyear' });
  expect(fetch).toHaveBeenCalledTimes(3);
});

test('keeps search results when only surrounding whitespace changes', async () => {
  mount();
  await screen.findByRole('button', { name: 'Use Buzz Lightyear' });
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'aliens' },
  });
  await screen.findByRole('button', { name: 'Use Ancient Aliens' });
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: ' aliens ' },
  });
  expect(
    screen.getByRole('button', { name: 'Use Ancient Aliens' }),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(2);
});

test('ignores a search response that completes after a newer query', async () => {
  mount();
  await screen.findByRole('button', { name: 'Use Buzz Lightyear' });
  let finish: (response: Response) => void = () => {};
  rs.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'buzz' },
  });
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'aliens' },
  });
  await screen.findByRole('button', { name: 'Use Ancient Aliens' });
  await act(async () =>
    finish(
      new Response(JSON.stringify({ success: true, total: 0, templates: [] })),
    ),
  );
  expect(
    screen.getByRole('button', { name: 'Use Ancient Aliens' }),
  ).toBeInTheDocument();
});

test('edits captions and style, supports keyboard positioning, and resets on template change', async () => {
  mount();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Use Buzz Lightyear' }),
  );
  const text = await screen.findByLabelText('Caption 1 text');
  fireEvent.change(text, { target: { value: 'Hello there' } });
  fireEvent.change(screen.getByLabelText('Caption 1 text size'), {
    target: { value: '12' },
  });
  fireEvent.change(screen.getByLabelText('Caption 1 text color'), {
    target: { value: '#ff0000' },
  });
  expect(text).toHaveValue('Hello there');
  expect(text).toHaveAttribute('aria-label', 'Caption 1 text');
  fireEvent.click(screen.getByRole('button', { name: 'Use Buzz Lightyear' }));
  expect(screen.getByLabelText('Caption 1 text')).toHaveValue('Hello there');
  expect(screen.getByLabelText('Caption 1 text size')).toHaveValue('12');
  const handle = screen.getByRole('button', { name: /^move caption 1\./i });
  const previous = handle.style.left;
  fireEvent.keyDown(handle, { key: 'ArrowRight' });
  expect(handle.style.left).not.toBe(previous);
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /download png/i })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Use Ancient Aliens' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Caption 1 text')).toHaveValue(''),
  );
});

test('adds and removes captions while preserving existing text, styles, and positions', async () => {
  mount();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Use Buzz Lightyear' }),
  );
  fireEvent.change(await screen.findByLabelText('Caption 1 text'), {
    target: { value: 'Keep me' },
  });
  fireEvent.change(screen.getByLabelText('Caption 1 text size'), {
    target: { value: '12' },
  });
  fireEvent.change(screen.getByLabelText('Caption 1 text color'), {
    target: { value: '#ff0000' },
  });
  const firstHandle = screen.getByRole('button', {
    name: /^move caption 1\./i,
  });
  fireEvent.keyDown(firstHandle, { key: 'ArrowRight' });
  const left = firstHandle.style.left;
  fireEvent.click(screen.getByRole('button', { name: 'Add caption' }));
  fireEvent.change(screen.getByLabelText('Caption 3 text'), {
    target: { value: 'Third caption' },
  });
  const thirdHandle = screen.getByRole('button', {
    name: /^move caption 3\./i,
  });
  fireEvent.keyDown(thirdHandle, { key: 'ArrowDown' });
  const top = thirdHandle.style.top;
  fireEvent.click(screen.getByRole('button', { name: 'Remove caption 2' }));
  expect(screen.getByLabelText('Caption 1 text')).toHaveValue('Keep me');
  expect(screen.getByLabelText('Caption 1 text size')).toHaveValue('12');
  expect(screen.getByLabelText('Caption 1 text color')).toHaveValue('#ff0000');
  expect(
    screen.getByRole('button', { name: /^move caption 1\./i }).style.left,
  ).toBe(left);
  expect(screen.getByLabelText('Caption 2 text')).toHaveValue('Third caption');
  expect(
    screen.getByRole('button', { name: /^move caption 2\./i }).style.top,
  ).toBe(top);
  expect(
    screen.getByRole('button', { name: /^move caption 2\./i }),
  ).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Add caption' }));
  expect(screen.getByLabelText('Caption 3 text')).toHaveValue('');
  expect(screen.getByLabelText('Caption 2 text')).toHaveValue('Third caption');
  fireEvent.click(screen.getByRole('button', { name: 'Use Ancient Aliens' }));
  await waitFor(() =>
    expect(screen.getByLabelText('Caption 1 text')).toHaveValue(''),
  );
  expect(screen.queryByLabelText('Caption 3 text')).not.toBeInTheDocument();
});

test('allows between one and ten captions and keeps a valid selection after removing the last', async () => {
  mount();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Use Buzz Lightyear' }),
  );
  await screen.findByLabelText('Caption 1 text');
  for (let index = 2; index < 10; index += 1)
    fireEvent.click(screen.getByRole('button', { name: 'Add caption' }));
  expect(screen.getByLabelText('Caption 10 text')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Add caption' })).toBeDisabled();
  for (let count = 10; count > 1; count -= 1)
    fireEvent.click(
      screen.getByRole('button', { name: `Remove caption ${count}` }),
    );
  expect(
    screen.getByRole('button', { name: 'Remove caption 1' }),
  ).toBeDisabled();
  expect(
    screen.getByRole('button', { name: /^move caption 1\./i }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'Add caption' })).toBeEnabled();
});

test('regenerates the exported PNG when captions are added or removed', async () => {
  const renderedTexts: string[][] = [];
  const baseContext = document.createElement('canvas').getContext('2d');
  if (!baseContext) throw new Error('Expected a mocked canvas context.');
  const contexts = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();
  rs.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    function (this: HTMLCanvasElement) {
      if (!contexts.has(this))
        contexts.set(this, { ...baseContext, fillText: rs.fn() });
      return contexts.get(this) ?? null;
    },
  );
  rs.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback,
  ) {
    const context = contexts.get(this);
    if (!context) throw new Error('PNG exported without rendering.');
    renderedTexts.push(
      rs.mocked(context.fillText).mock.calls.map((call) => String(call[0])),
    );
    callback(new Blob(['png'], { type: 'image/png' }));
  });
  mount();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Use Buzz Lightyear' }),
  );
  await screen.findByLabelText('Caption 1 text');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /download png/i })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Add caption' }));
  expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Caption 3 text'), {
    target: { value: 'Export me' },
  });
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /download png/i })).toBeEnabled(),
  );
  expect(renderedTexts.at(-1)).toContain('Export me');
  fireEvent.click(screen.getByRole('button', { name: 'Remove caption 3' }));
  expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /download png/i })).toBeEnabled(),
  );
  expect(renderedTexts.at(-1)).not.toContain('Export me');
});

test('ignores stale template requests and releases their images', async () => {
  let finishFirst: (value: ReturnType<typeof prepared>) => void = () => {};
  const stale = prepared();
  const current = prepared();
  rs.mocked(prepareMemeImage)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishFirst = resolve;
        }),
    )
    .mockResolvedValueOnce(current);
  const view = mount();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Use Buzz Lightyear' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Use Ancient Aliens' }));
  await screen.findByRole('img', { name: 'Ancient Aliens meme preview' });
  await act(async () => finishFirst(stale));
  expect(stale.release).toHaveBeenCalledTimes(1);
  expect(
    screen.getByRole('img', { name: 'Ancient Aliens meme preview' }),
  ).toBeInTheDocument();
  view.unmount();
  expect(current.release).toHaveBeenCalledTimes(1);
});

test('retries failed catalog loads and reports template failures', async () => {
  rs.mocked(fetch).mockRejectedValueOnce(new Error('Offline'));
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent(/offline/i);
  fireEvent.click(screen.getByRole('button', { name: /retry templates/i }));
  rs.mocked(prepareMemeImage).mockRejectedValueOnce(
    new Error('Broken template'),
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Use Buzz Lightyear' }),
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('Broken template');
  expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();
});

test('invalidates an encoded PNG immediately and ignores an outdated encoding', async () => {
  const encodings: BlobCallback[] = [];
  rs.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
    (callback) => {
      encodings.push(callback);
    },
  );
  mount();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Use Buzz Lightyear' }),
  );
  await screen.findByLabelText('Caption 1 text');
  await waitFor(() => expect(encodings.length).toBe(1));
  fireEvent.change(screen.getByLabelText('Caption 1 text'), {
    target: { value: 'New version' },
  });
  await act(async () => encodings[0](new Blob(['old'], { type: 'image/png' })));
  expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();
  await waitFor(() => expect(encodings.length).toBe(2));
  await act(async () => encodings[1](new Blob(['new'], { type: 'image/png' })));
  expect(screen.getByRole('button', { name: /download png/i })).toBeEnabled();
});

test('registers the home card, lazy route, and registry-derived metadata', async () => {
  const home = render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole('link', { name: /Meme Maker/i }),
  ).toHaveAttribute('href', '/image/meme-maker');
  home.unmount();
  render(
    <MemoryRouter initialEntries={['/image/meme-maker']}>
      <AppRoutes />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole('heading', { name: 'Meme Maker' }),
  ).toBeInTheDocument();
  expect(getPageMetadata('/image/meme-maker')).toMatchObject({
    browserTitle: 'Meme Maker | Yehezgun Tools',
    canonicalUrl: 'https://tools.yehezgun.com/image/meme-maker',
  });
});

test('drags captions with a stable pointer offset and clamps their bounds', async () => {
  rs.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 640,
    height: 480,
  } as DOMRect);
  mount();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Use Buzz Lightyear' }),
  );
  const handle = await screen.findByRole('button', {
    name: /^move caption 1\./i,
  });
  fireEvent.pointerDown(handle, {
    pointerId: 1,
    button: 0,
    clientX: 320,
    clientY: 58,
  });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 10, clientY: 470 });
  expect(Number.parseFloat(handle.style.left)).toBeGreaterThanOrEqual(45);
  expect(Number.parseFloat(handle.style.top)).toBeGreaterThan(80);
  fireEvent.pointerCancel(handle, { pointerId: 1 });
  const top = handle.style.top;
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 320, clientY: 100 });
  expect(handle.style.top).toBe(top);
});

test('copies the PNG, reports permission denial, and retains download', async () => {
  rs.stubGlobal('isSecureContext', true);
  rs.stubGlobal('ClipboardItem', class {});
  const write = rs.fn().mockResolvedValue(undefined);
  rs.spyOn(navigator, 'clipboard', 'get').mockReturnValue({
    write,
  } as unknown as Clipboard);
  rs.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download');
  const click = rs
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
  mount();
  fireEvent.click(
    await screen.findByRole('button', { name: 'Use Buzz Lightyear' }),
  );
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Copy image' })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Copy image' }));
  await screen.findByText(/image copied/i);
  expect(write).toHaveBeenCalledTimes(1);
  write.mockRejectedValueOnce(new Error('NotAllowedError'));
  fireEvent.click(screen.getByRole('button', { name: 'Copy image' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    /download the png instead/i,
  );
  fireEvent.click(screen.getByRole('button', { name: /download png/i }));
  expect(click).toHaveBeenCalledTimes(1);
});
