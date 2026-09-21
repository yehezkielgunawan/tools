import { beforeEach, expect, rs, test } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import PwaUpdatePrompt from '../src/pwa/PwaUpdatePrompt';

const skipWaiting = rs.fn().mockResolvedValue(undefined);

rs.mock('rsbuild-plugin-pwa_vm/react', () => ({
  useRegisterSW: () => ({
    newSwActive: [false, rs.fn()],
    newSwWaiting: [true, rs.fn()],
    offlineReady: [false, rs.fn()],
    skipWaiting,
  }),
}));

beforeEach(() => {
  skipWaiting.mockClear();
});

test('offers a refresh action when a new service worker is waiting', () => {
  render(<PwaUpdatePrompt />);

  expect(screen.getByRole('status')).toHaveTextContent(/new version/i);

  fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

  expect(skipWaiting).toHaveBeenCalledTimes(1);
});

test('lets the user dismiss the update prompt for the current session', () => {
  render(<PwaUpdatePrompt />);

  fireEvent.click(screen.getByRole('button', { name: /later/i }));

  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
