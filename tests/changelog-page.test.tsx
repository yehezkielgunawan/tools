import { expect, test } from '@rstest/core';
import { render, screen } from '@testing-library/react';
import { APP_VERSION } from '../src/config/app';
import { CHANGELOG } from '../src/config/changelog';
import ChangelogPage from '../src/pages/ChangelogPage';

test('renders the current release and categorized changes', () => {
  render(<ChangelogPage />);

  expect(
    screen.getByRole('heading', { name: /changelog/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: `v${APP_VERSION}` }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: /features/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(
      CHANGELOG[0]?.changes.features?.[0]?.description ?? 'Missing feature',
    ),
  ).toBeInTheDocument();
});

test('renders release dates and scopes for changelog items', () => {
  render(<ChangelogPage />);

  expect(screen.getByText('September 23, 2026')).toBeInTheDocument();
  expect(screen.getByText('ui')).toBeInTheDocument();
});
