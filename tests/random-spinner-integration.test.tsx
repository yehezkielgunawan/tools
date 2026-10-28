import { afterEach, expect, test } from '@rstest/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from '../src/app/App';
import { ToolSearchProvider } from '../src/components/ui/ToolSearch';
import HomePage from '../src/pages/HomePage';
import { getPageMetadata } from '../src/seo/pageMetadata';
import { tools } from '../src/tools/registry';

afterEach(() => localStorage.clear());

test('registers the spinner with generator metadata and renders its lazy route', async () => {
  expect(tools).toContainEqual(
    expect.objectContaining({
      id: 'random-spinner',
      category: 'generator',
      path: '/generator/random-spinner',
      keywords: expect.arrayContaining(['wheel', 'picker', 'raffle']),
    }),
  );
  expect(getPageMetadata('/generator/random-spinner')).toMatchObject({
    browserTitle: 'Random Spinner Wheel | Yehezgun Tools',
    canonicalUrl: 'https://tools.yehezgun.com/generator/random-spinner',
  });
  render(
    <MemoryRouter initialEntries={['/generator/random-spinner']}>
      <App />
    </MemoryRouter>,
  );
  expect(
    await screen.findByRole('heading', { name: 'Random Spinner Wheel' }),
  ).toBeInTheDocument();
  expect(
    within(
      screen.getByRole('navigation', { name: 'Workspace navigation' }),
    ).getByRole('link', { name: 'Random Spinner Wheel' }),
  ).toHaveAttribute('href', '/generator/random-spinner');
});

test('discovers the spinner on the homepage and by raffle search', () => {
  render(
    <MemoryRouter>
      <ToolSearchProvider>
        <HomePage />
      </ToolSearchProvider>
    </MemoryRouter>,
  );
  expect(
    screen.getByRole('link', { name: /Random Spinner Wheel/ }),
  ).toHaveAttribute('href', '/generator/random-spinner');
  fireEvent.click(screen.getByRole('button', { name: /Search tools/ }));
  fireEvent.change(screen.getByRole('searchbox'), {
    target: { value: 'raffle' },
  });
  expect(
    within(screen.getByRole('dialog')).getByRole('link', {
      name: /Random Spinner Wheel/,
    }),
  ).toHaveAttribute('href', '/generator/random-spinner');
});
