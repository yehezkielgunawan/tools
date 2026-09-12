import { expect, test } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import CopyButton from '../src/components/ui/CopyButton';

function setClipboard(writeText: (value: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

test('shows copied feedback after writing to the clipboard', async () => {
  let copiedValue = '';
  setClipboard(async (value) => {
    copiedValue = value;
  });

  render(<CopyButton text="https://example.com" />);

  fireEvent.click(screen.getByRole('button', { name: /copy/i }));

  expect(
    await screen.findByRole('button', { name: /copied/i }),
  ).toBeInTheDocument();
  expect(copiedValue).toBe('https://example.com');
});

test('shows an error when clipboard access fails', async () => {
  setClipboard(async () => {
    throw new Error('Permission denied');
  });

  render(<CopyButton text="private text" />);

  fireEvent.click(screen.getByRole('button', { name: /copy/i }));

  expect(await screen.findByRole('alert')).toHaveTextContent(/unable to copy/i);
});

test('disables copying when there is no text', () => {
  render(<CopyButton text="" />);

  expect(screen.getByRole('button', { name: /copy/i })).toBeDisabled();
});
