import { expect, test } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { ThemeProvider } from '../src/app/ThemeProvider';
import Header from '../src/components/layout/Header';

function renderHeader(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider initialTheme="light">
        <Header />
      </ThemeProvider>
    </MemoryRouter>,
  );
}

test('renders the branded home link with the favicon asset', () => {
  renderHeader();

  const homeLink = screen.getByRole('link', { name: /yehezgun tools/i });
  const logo = homeLink.querySelector('img');

  expect(logo).not.toBeNull();
  expect(logo).toHaveAttribute('src', '/yehezgun-tools-favicon.svg');
});

test('opens registry tools grouped by category', () => {
  renderHeader();

  const toolsSummary = screen.getByText('Tools');
  const toolsMenu = toolsSummary.closest('details');

  expect(toolsMenu).not.toBeNull();
  fireEvent.click(toolsSummary);

  expect(toolsMenu).toHaveAttribute('open');
  expect(screen.getByText('Generator')).toBeInTheDocument();
  expect(screen.getByText('Developer')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /whatsapp link generator/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: /json formatter/i }),
  ).toBeInTheDocument();
});

test('marks the current tool and closes the menu after navigation', () => {
  renderHeader('/developer/json-formatter');

  const toolsSummary = screen.getByText('Tools');
  const toolsMenu = toolsSummary.closest('details');
  fireEvent.click(toolsSummary);

  const jsonLink = screen.getByRole('link', { name: /json formatter/i });
  expect(jsonLink).toHaveAttribute('aria-current', 'page');

  fireEvent.click(
    screen.getByRole('link', { name: /whatsapp link generator/i }),
  );

  expect(toolsMenu).not.toHaveAttribute('open');
});
