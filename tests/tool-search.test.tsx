import { expect, test } from '@rstest/core';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { ThemeProvider } from '../src/app/ThemeProvider';
import AppShell from '../src/components/layout/AppShell';
import HomePage from '../src/pages/HomePage';

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider initialTheme="light">
        <AppShell>
          <Routes>
            <Route element={<HomePage />} path="/" />
            <Route element={<h1>Changelog page</h1>} path="/changelog" />
            <Route
              element={<h1>JSON tool page</h1>}
              path="/developer/json-formatter"
            />
            <Route
              element={<h1>Image Watermark page</h1>}
              path="/image/image-watermark"
            />
          </Routes>
        </AppShell>
      </ThemeProvider>
    </MemoryRouter>,
  );
}

test('opens search from the homepage button and matches tool keywords', () => {
  renderApp();

  fireEvent.click(screen.getByRole('button', { name: /search tools/i }));

  const dialog = screen.getByRole('dialog', { name: /search tools/i });
  expect(dialog).toHaveClass('modal-middle');
  const searchInput = within(dialog).getByRole('searchbox', {
    name: /search tools/i,
  });
  expect(searchInput).toHaveFocus();

  fireEvent.change(searchInput, { target: { value: 'signature' } });

  expect(
    within(dialog).getByRole('link', { name: /pdf editor/i }),
  ).toHaveAttribute('href', '/pdf/pdf-editor');
  expect(
    within(dialog).queryByRole('link', { name: /qr code generator/i }),
  ).not.toBeInTheDocument();

  fireEvent.change(searchInput, {
    target: { value: 'directly in your browser' },
  });
  expect(
    within(dialog).getByRole('link', { name: /json formatter/i }),
  ).toHaveAttribute('href', '/developer/json-formatter');
});

test('opens search with Ctrl+K from a non-homepage route', () => {
  renderApp('/changelog');

  fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

  expect(
    screen.getByRole('heading', { name: 'Changelog page' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('dialog', { name: /search tools/i })).toBeVisible();
  expect(
    within(screen.getByRole('dialog')).getByRole('searchbox', {
      name: /search tools/i,
    }),
  ).toHaveFocus();
});

test('opens search with Cmd+K from a non-homepage route', () => {
  renderApp('/changelog');

  fireEvent.keyDown(document, { key: 'k', metaKey: true });

  expect(screen.getByRole('dialog', { name: /search tools/i })).toBeVisible();
});

test('keeps search keyboard focus active while the mobile navigation is open', () => {
  renderApp();
  const navigationButton = screen.getByRole('button', {
    name: /open navigation/i,
  });
  fireEvent.click(navigationButton);
  fireEvent.keyDown(document, { key: 'k', ctrlKey: true });

  const dialog = screen.getByRole('dialog', { name: /search tools/i });
  const searchInput = within(dialog).getByRole('searchbox', {
    name: /search tools/i,
  });
  fireEvent.keyDown(document, { key: 'Tab' });

  expect(searchInput).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });

  expect(dialog).not.toHaveAttribute('open');
  expect(navigationButton).toHaveAttribute('aria-expanded', 'true');
});

test('closes search with Escape', () => {
  renderApp();
  const trigger = screen.getByRole('button', { name: /search tools/i });
  fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: /search tools/i });

  fireEvent.keyDown(document, { key: 'Escape' });

  expect(dialog).not.toHaveAttribute('open');
  expect(trigger).toHaveFocus();
});

test('shows an empty state when there are no matching tools', () => {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /search tools/i }));

  fireEvent.change(
    within(screen.getByRole('dialog', { name: /search tools/i })).getByRole(
      'searchbox',
      { name: /search tools/i },
    ),
    { target: { value: 'unlisted utility' } },
  );

  expect(screen.getByText(/no tools found for/i)).toBeInTheDocument();
});

test('announces a short result count rather than the full result list', () => {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /search tools/i }));
  const dialog = screen.getByRole('dialog', { name: /search tools/i });
  fireEvent.change(within(dialog).getByRole('searchbox'), {
    target: { value: 'unlisted utility' },
  });
  expect(within(dialog).getByRole('status')).toHaveTextContent(
    'No tools found',
  );
  expect(within(dialog).getByRole('status')).not.toContainElement(
    within(dialog).getByText(/to navigate/i),
  );
});

test('moves through search results with arrow keys and opens the focused result with Enter', () => {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /search tools/i }));

  const dialog = screen.getByRole('dialog', { name: /search tools/i });
  const searchInput = within(dialog).getByRole('searchbox', {
    name: /search tools/i,
  });
  fireEvent.change(searchInput, { target: { value: 'image' } });

  const [firstResult, secondResult] = within(dialog).getAllByRole('link');
  if (!firstResult || !secondResult) {
    throw new Error('Expected two image tool results');
  }

  fireEvent.keyDown(searchInput, { key: 'ArrowDown' });
  expect(firstResult).toHaveFocus();
  fireEvent.keyDown(firstResult, { key: 'ArrowDown' });
  expect(secondResult).toHaveFocus();
  fireEvent.keyDown(secondResult, { key: 'ArrowUp' });
  expect(firstResult).toHaveFocus();
  fireEvent.keyDown(firstResult, { key: 'ArrowUp' });
  expect(secondResult).toHaveFocus();
  fireEvent.keyDown(secondResult, { key: 'Enter' });

  expect(
    screen.getByRole('heading', { name: 'Image Watermark page' }),
  ).toBeInTheDocument();
  expect(dialog).not.toHaveAttribute('open');
});

test('navigates to a result and closes search when it is selected', () => {
  renderApp();
  fireEvent.click(screen.getByRole('button', { name: /search tools/i }));

  const dialog = screen.getByRole('dialog', { name: /search tools/i });
  fireEvent.change(
    within(dialog).getByRole('searchbox', { name: /search tools/i }),
    { target: { value: 'json' } },
  );
  fireEvent.click(
    within(dialog).getByRole('link', { name: /json formatter/i }),
  );

  expect(
    screen.getByRole('heading', { name: 'JSON tool page' }),
  ).toBeInTheDocument();
  expect(dialog).not.toBeVisible();
});
