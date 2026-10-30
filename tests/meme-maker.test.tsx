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
      async () =>
        new Response(
          JSON.stringify([
            {
              id: 'buzz',
              name: 'Buzz Lightyear',
              lines: 2,
              overlays: 0,
              blank: 'https://api.memegen.link/images/buzz.jpg',
            },
            {
              id: 'aag',
              name: 'Ancient Aliens',
              lines: 2,
              overlays: 0,
              blank: 'https://api.memegen.link/images/aag.jpg',
            },
          ]),
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

test('browses and searches templates locally with clear privacy information', async () => {
  mount();
  expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();
  await screen.findByRole('button', { name: 'Use Buzz Lightyear' });
  fireEvent.change(
    screen.getByRole('searchbox', { name: /search templates/i }),
    { target: { value: 'ALIENS' } },
  );
  expect(
    screen.queryByRole('button', { name: 'Use Buzz Lightyear' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'Use Ancient Aliens' }),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'not found' },
  });
  expect(screen.getByText(/no templates match/i)).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(
    screen.getByText(/your captions and finished memes stay on your device/i),
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
  const handle = screen.getByRole('button', { name: /move caption 1/i });
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
  const handle = await screen.findByRole('button', { name: /move caption 1/i });
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
