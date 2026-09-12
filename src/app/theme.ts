export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark';
}

export function resolveInitialTheme(
  storage: Pick<Storage, 'getItem'> | undefined,
  prefersDark: boolean,
): Theme {
  try {
    const savedTheme = storage?.getItem(THEME_STORAGE_KEY) ?? null;

    if (isTheme(savedTheme)) {
      return savedTheme;
    }
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }

  return prefersDark ? 'dark' : 'light';
}

export function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = theme;
  }
}

export function initializeTheme(): Theme {
  const prefersDark =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = resolveInitialTheme(
    typeof window !== 'undefined' ? window.localStorage : undefined,
    prefersDark,
  );

  applyTheme(theme);
  return theme;
}
