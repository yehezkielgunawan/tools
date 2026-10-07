import { webcrypto } from 'node:crypto';
import { afterEach, expect, rs, test } from '@rstest/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from '../src/app/App';
import { AppRoutes } from '../src/app/router';
import { getPageMetadata } from '../src/seo/pageMetadata';
import { tools } from '../src/tools/registry';

afterEach(() => {
  rs.restoreAllMocks();
  rs.unstubAllGlobals();
});

test('registers the developer tool and supplies route metadata', () => {
  expect(tools).toContainEqual(
    expect.objectContaining({
      id: 'key-pair-generator',
      name: 'Key Pair Generator',
      category: 'developer',
      path: '/developer/key-pair-generator',
      keywords: expect.arrayContaining([
        'rsa',
        'ec',
        'pem',
        'public key',
        'private key',
      ]),
    }),
  );
  expect(getPageMetadata('/developer/key-pair-generator')).toMatchObject({
    browserTitle: 'Key Pair Generator | Yehezgun Tools',
    canonicalUrl: 'https://tools.yehezgun.com/developer/key-pair-generator',
  });
});

test('renders the lazy-loaded route and generates keys without network or storage writes', async () => {
  rs.stubGlobal('crypto', webcrypto);
  const fetch = rs.spyOn(globalThis, 'fetch');
  const storage = rs.spyOn(Storage.prototype, 'setItem');
  render(
    <MemoryRouter initialEntries={['/developer/key-pair-generator']}>
      <AppRoutes />
    </MemoryRouter>,
  );
  await screen.findByRole('heading', { name: 'Key Pair Generator' });
  fireEvent.click(screen.getByRole('button', { name: /^generate key pair$/i }));
  await screen.findByText('RSA · 2048 bits');
  expect(
    (screen.getByRole('textbox', { name: 'Public key' }) as HTMLTextAreaElement)
      .value,
  ).toContain('-----BEGIN PUBLIC KEY-----');
  fireEvent.click(screen.getByRole('button', { name: /show private key/i }));
  expect(
    (
      screen.getByRole('textbox', {
        name: 'Private key',
      }) as HTMLTextAreaElement
    ).value,
  ).toContain('-----BEGIN PRIVATE KEY-----');
  expect(fetch).not.toHaveBeenCalled();
  expect(storage).not.toHaveBeenCalled();
});

test('discovers the tool on the homepage, in navigation, and through key keywords', async () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole('heading', { name: 'Key Pair Generator' }).closest('a'),
  ).toHaveAttribute('href', '/developer/key-pair-generator');
  const sidebar = screen.getByRole('complementary', {
    name: 'Tool navigation',
  });
  expect(
    within(sidebar).getByRole('link', { name: 'Key Pair Generator' }),
  ).toHaveAttribute('href', '/developer/key-pair-generator');
  fireEvent.click(screen.getByRole('button', { name: /search tools/i }));
  const dialog = screen.getByRole('dialog', { name: /search tools/i });
  for (const keyword of ['rsa', 'ec', 'pem', 'public key', 'private key']) {
    fireEvent.change(within(dialog).getByRole('searchbox'), {
      target: { value: keyword },
    });
    expect(
      within(dialog).getByRole('link', { name: /key pair generator/i }),
    ).toHaveAttribute('href', '/developer/key-pair-generator');
  }
  fireEvent.click(
    within(dialog).getByRole('link', { name: /key pair generator/i }),
  );
  expect(
    await screen.findByRole('heading', { name: 'Key Pair Generator' }),
  ).toBeInTheDocument();
  expect(dialog).not.toBeVisible();
});
