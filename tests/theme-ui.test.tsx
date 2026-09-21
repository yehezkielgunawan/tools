import { expect, test } from '@rstest/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import App from '../src/app/App';

test('toggles and persists the selected theme', () => {
  localStorage.setItem('theme', 'light');

  render(
    <MemoryRouter initialEntries={['/']}>
      <App initialTheme="light" />
    </MemoryRouter>,
  );

  fireEvent.click(
    screen.getAllByRole('button', { name: /switch to dark mode/i })[0],
  );

  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem('theme')).toBe('dark');
  expect(
    screen.getAllByRole('button', { name: /switch to light mode/i })[0],
  ).toBeInTheDocument();
});
