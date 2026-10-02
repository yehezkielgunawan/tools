import { afterEach, beforeEach, expect, rs, test } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { AppRoutes } from '../src/app/router';
import GreetingCardGenerator from '../src/tools/greeting-card/GreetingCardGenerator';
import { tools } from '../src/tools/registry';

beforeEach(() => {
  rs.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response('png', { headers: { 'Content-Type': 'image/png' } }),
  );
  rs.spyOn(URL, 'createObjectURL').mockReturnValue('blob:greeting-card');
  rs.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => rs.restoreAllMocks());

function renderTool() {
  return render(
    <MemoryRouter>
      <GreetingCardGenerator />
    </MemoryRouter>,
  );
}

test('starts with an editable birthday card and gives an accurate service privacy note', async () => {
  renderTool();
  expect(screen.getByLabelText('Occasion')).toHaveValue('birthday');
  expect(screen.getByLabelText('Heading')).toHaveValue('Happy birthday!');
  expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();
  expect(screen.getByText(/card text is sent to/i)).toBeInTheDocument();
  expect(
    screen.queryByText(/your data is not uploaded/i),
  ).not.toBeInTheDocument();
  expect(
    await screen.findByRole('img', { name: /greeting card preview/i }),
  ).toHaveAttribute('src', 'blob:greeting-card');
  expect(screen.getByRole('button', { name: /download png/i })).toBeEnabled();
});

test('keeps customized text when changing occasion or design and maps appreciation to thank-you', async () => {
  renderTool();
  fireEvent.change(screen.getByLabelText('Heading'), {
    target: { value: 'You made my day' },
  });
  fireEvent.change(screen.getByLabelText('Occasion'), {
    target: { value: 'thank-you' },
  });
  expect(screen.getByLabelText('Heading')).toHaveValue('You made my day');
  expect(screen.getByLabelText('Message')).toHaveValue(
    'Your kindness made a difference. Thank you for being there, and for being you.',
  );
  fireEvent.change(screen.getByLabelText('Template'), {
    target: { value: 'elegant' },
  });
  fireEvent.change(screen.getByLabelText('Palette'), {
    target: { value: 'cool' },
  });
  fireEvent.change(screen.getByLabelText('Format'), {
    target: { value: 'portrait' },
  });
  await screen.findByRole('img', { name: /greeting card preview/i });
  const request = rs.mocked(fetch).mock.calls[0]?.[1];
  expect(JSON.parse(request?.body as string)).toMatchObject({
    occasion: 'thank-you',
    heading: 'You made my day',
    template: 'elegant',
    theme: 'cool',
    size: 'portrait',
  });
});

test('downloads exactly the preview image without a second request', async () => {
  const click = rs
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {});
  renderTool();
  await screen.findByRole('img', { name: /greeting card preview/i });
  fireEvent.click(screen.getByRole('button', { name: /download png/i }));
  expect(click.mock.instances[0]).toHaveProperty('href', 'blob:greeting-card');
  expect(click.mock.instances[0]).toHaveProperty(
    'download',
    'birthday-greeting-card-square.png',
  );
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('associates validation feedback with fields and prevents stale downloads', async () => {
  renderTool();
  await screen.findByRole('img', { name: /greeting card preview/i });
  const message = screen.getByLabelText('Message');
  fireEvent.change(message, {
    target: { value: Array(13).fill('Hi').join('\n') },
  });
  expect(message).toHaveAttribute('aria-invalid', 'true');
  expect(message).toHaveAttribute(
    'aria-describedby',
    expect.stringContaining('card-message-error'),
  );
  expect(screen.getByText(/use 12 lines/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /download png/i })).toBeDisabled();
  expect(
    screen.getByRole('img', { name: /greeting card preview/i }),
  ).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('shows network failure feedback and lets the user retry', async () => {
  rs.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));
  renderTool();
  expect(await screen.findByRole('alert')).toHaveTextContent(
    /internet connection/i,
  );
  fireEvent.click(screen.getByRole('button', { name: /retry preview/i }));
  await screen.findByRole('img', { name: /greeting card preview/i });
  expect(screen.getByRole('button', { name: /download png/i })).toBeEnabled();
});

test('registers the tool and renders its lazy-loaded route', async () => {
  expect(tools).toContainEqual(
    expect.objectContaining({
      name: 'Greeting Card Generator',
      path: '/generator/greeting-card',
      keywords: expect.arrayContaining([
        'birthday',
        'appreciation',
        'thank you',
      ]),
    }),
  );
  render(
    <MemoryRouter initialEntries={['/generator/greeting-card']}>
      <AppRoutes />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole('heading', { name: 'Greeting Card Generator' }),
  ).toBeInTheDocument();
});
