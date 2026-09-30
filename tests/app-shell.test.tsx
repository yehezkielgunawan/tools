import { expect, test } from '@rstest/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { lazy, Suspense } from 'react';
import { Link, MemoryRouter, Route, Routes } from 'react-router';
import { ThemeProvider } from '../src/app/ThemeProvider';
import AppShell from '../src/components/layout/AppShell';
import { APP_VERSION } from '../src/config/app';

function renderShell(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider initialTheme="light">
        <AppShell>
          <p>Workspace content</p>
        </AppShell>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

test('renders the branded sidebar and registry-driven tool navigation', () => {
  renderShell();

  expect(
    screen.getByRole('complementary', { name: /tool navigation/i }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /yehezgun tools/i })).toHaveAttribute(
    'href',
    '/',
  );
  expect(screen.getByRole('link', { name: /all tools/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /changelog/i })).toHaveAttribute(
    'href',
    '/changelog',
  );
  expect(screen.getByText(`v${APP_VERSION}`)).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: /generator/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: /developer/i }),
  ).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /^image$/i })).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /whatsapp link generator/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /json formatter/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /image compressor/i }),
  ).toBeInTheDocument();
});

test('shows the author attribution at the bottom of the sidebar and opens it in a new tab', () => {
  renderShell();

  const sidebar = screen.getByRole('complementary', {
    name: /tool navigation/i,
  });
  const attribution = within(sidebar).getByRole('link', {
    name: 'Made by Yehezkiel Gunawan',
  });
  expect(attribution).toHaveAttribute('href', 'https://yehezgun.com');
  expect(attribution).toHaveAttribute('target', '_blank');
  expect(attribution).toHaveAttribute('rel', 'noopener noreferrer');
});

test('marks the current route and closes the mobile drawer after navigation', () => {
  renderShell('/developer/json-formatter');

  const jsonLink = screen.getByRole('link', { name: /json formatter/i });
  expect(jsonLink).toHaveAttribute('aria-current', 'page');

  const menuButton = screen.getByRole('button', { name: /open navigation/i });
  expect(menuButton).toHaveAttribute('aria-controls', 'app-navigation-panel');
  expect(
    screen.getByRole('complementary', { name: /tool navigation/i }),
  ).toHaveAttribute('id', 'app-navigation-panel');
  fireEvent.click(menuButton);
  expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  expect(menuButton).toHaveAccessibleName('Close navigation');

  fireEvent.click(
    screen.getByRole('link', { name: /whatsapp link generator/i }),
  );

  expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  expect(menuButton).toHaveAccessibleName('Open navigation');
});

test('keeps keyboard focus inside the open drawer', () => {
  renderShell();

  fireEvent.click(screen.getByRole('button', { name: /open navigation/i }));

  const drawer = screen.getByRole('complementary', {
    name: /tool navigation/i,
  });
  const firstLink = within(drawer).getAllByRole('link')[0];
  const lastFocusable = within(drawer).getByRole('link', {
    name: 'Made by Yehezkiel Gunawan',
  });

  expect(screen.getByRole('main').parentElement).toHaveAttribute('inert');

  lastFocusable.focus();
  fireEvent.keyDown(document, { key: 'Tab' });
  expect(firstLink).toHaveFocus();

  firstLink.focus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(lastFocusable).toHaveFocus();
});

test('closes an open drawer when the viewport grows to desktop width', () => {
  const originalInnerWidth = window.innerWidth;
  renderShell();

  const menuButton = screen.getByRole('button', { name: /open navigation/i });
  fireEvent.click(menuButton);
  expect(menuButton).toHaveAttribute('aria-expanded', 'true');

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: 1200,
  });
  fireEvent.resize(window);

  expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  expect(screen.getByRole('main').parentElement).not.toHaveAttribute('inert');

  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: originalInnerWidth,
  });
});

test('closes the drawer on escape and restores focus to its trigger', () => {
  renderShell();

  const menuButton = screen.getByRole('button', { name: /open navigation/i });
  fireEvent.click(menuButton);
  expect(menuButton).toHaveAttribute('aria-expanded', 'true');

  fireEvent.keyDown(document, { key: 'Escape' });

  expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  expect(menuButton).toHaveFocus();
});

test('restores focus when an already-active drawer link is selected', () => {
  renderShell('/');
  const menuButton = screen.getByRole('button', { name: 'Open navigation' });
  fireEvent.click(menuButton);
  fireEvent.click(screen.getByRole('link', { name: 'All tools' }));
  expect(menuButton).toHaveFocus();
});

test('focuses the destination rather than the menu button after drawer navigation', async () => {
  render(
    <MemoryRouter>
      <ThemeProvider initialTheme="light">
        <AppShell>
          <Routes>
            <Route element={<h1>Home</h1>} path="/" />
            <Route element={<h1>Changelog</h1>} path="/changelog" />
          </Routes>
        </AppShell>
      </ThemeProvider>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }));
  fireEvent.click(screen.getByRole('link', { name: 'Changelog' }));
  expect(
    await screen.findByRole('heading', { level: 1, name: 'Changelog' }),
  ).toHaveFocus();
});

test('offers a skip link that focuses the main content', () => {
  renderShell();
  const skip = screen.getByRole('link', { name: 'Skip to main content' });
  expect(skip).toHaveAttribute('href', '#main-content');
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
});

test('focuses the destination heading after client-side navigation', async () => {
  render(
    <MemoryRouter>
      <ThemeProvider initialTheme="light">
        <AppShell>
          <Routes>
            <Route
              element={
                <>
                  <h1>Home</h1>
                  <Link to="/next">Next page</Link>
                </>
              }
              path="/"
            />
            <Route element={<h1>Next page</h1>} path="/next" />
          </Routes>
        </AppShell>
      </ThemeProvider>
    </MemoryRouter>,
  );

  fireEvent.click(screen.getByRole('link', { name: 'Next page' }));
  expect(
    await screen.findByRole('heading', { name: 'Next page' }),
  ).toHaveFocus();
});

test('waits for a lazy route heading before moving focus', async () => {
  let resolvePage!: (value: { default: () => React.JSX.Element }) => void;
  const DeferredPage = lazy(
    () =>
      new Promise<{ default: () => React.JSX.Element }>((resolve) => {
        resolvePage = resolve;
      }),
  );
  render(
    <MemoryRouter>
      <ThemeProvider initialTheme="light">
        <AppShell>
          <Suspense fallback={<p>Loading page</p>}>
            <Routes>
              <Route
                element={
                  <>
                    <h1>Home</h1>
                    <Link to="/deferred">Open deferred page</Link>
                  </>
                }
                path="/"
              />
              <Route element={<DeferredPage />} path="/deferred" />
            </Routes>
          </Suspense>
        </AppShell>
      </ThemeProvider>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('link', { name: 'Open deferred page' }));
  resolvePage({ default: () => <h1>Deferred page</h1> });
  expect(
    await screen.findByRole('heading', { name: 'Deferred page' }),
  ).toHaveFocus();
});
