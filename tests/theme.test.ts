import { afterEach, beforeEach, expect, test } from '@rstest/core';
import { initializeTheme, resolveInitialTheme } from '../src/app/theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

test('uses a valid saved theme before the system preference', () => {
  localStorage.setItem('theme', 'light');

  expect(resolveInitialTheme(localStorage, true)).toBe('light');
});

test('uses the system preference when no saved theme exists', () => {
  expect(resolveInitialTheme(localStorage, true)).toBe('dark');
  expect(resolveInitialTheme(localStorage, false)).toBe('light');
});

test('falls back to light for invalid saved values', () => {
  localStorage.setItem('theme', 'sepia');

  expect(resolveInitialTheme(localStorage, false)).toBe('light');
});

test('applies the initial theme to the document', () => {
  localStorage.setItem('theme', 'dark');

  expect(initializeTheme()).toBe('dark');
  expect(document.documentElement.dataset.theme).toBe('dark');
});
