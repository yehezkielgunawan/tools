import { expect, test } from '@rstest/core';
import { render, screen, within } from '@testing-library/react';
import { APP_VERSION } from '../src/config/app';
import { CHANGELOG } from '../src/config/changelog';
import ChangelogPage from '../src/pages/ChangelogPage';

test('renders the current release and categorized changes', () => {
  render(<ChangelogPage />);

  const currentRelease = screen.getByRole('article', {
    name: `v${APP_VERSION}`,
  });
  const currentReleaseItems = Object.values(CHANGELOG[0]?.changes ?? {}).flat();

  expect(
    screen.getByRole('heading', { name: /changelog/i }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: `v${APP_VERSION}` }),
  ).toBeInTheDocument();
  expect(
    within(currentRelease).getAllByRole('heading', { level: 3 }),
  ).not.toHaveLength(0);
  expect(
    within(currentRelease).getByText(
      currentReleaseItems[0]?.description ?? 'Missing change',
    ),
  ).toBeInTheDocument();
});

test('renders release dates and scopes for changelog items', () => {
  render(<ChangelogPage />);

  const releaseWithScopedItem = CHANGELOG.find((release) =>
    Object.values(release.changes).some((items) =>
      items?.some((item) => item.scope),
    ),
  );
  const scopedItem = Object.values(releaseWithScopedItem?.changes ?? {})
    .flat()
    .find((item) => item.scope);
  const release = screen.getByRole('article', {
    name: `v${releaseWithScopedItem?.version}`,
  });

  expect(
    within(release).getByText(
      new Intl.DateTimeFormat('en-US', {
        dateStyle: 'long',
        timeZone: 'UTC',
      }).format(new Date(`${releaseWithScopedItem?.date}T00:00:00Z`)),
    ),
  ).toBeInTheDocument();
  expect(
    within(release).getByText(scopedItem?.scope ?? 'Missing scope'),
  ).toBeInTheDocument();
});
