import { createContext, type ReactNode, useContext, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { applyTheme, THEME_STORAGE_KEY, type Theme } from './theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme: Theme;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  const [theme, storeTheme] = useLocalStorage<Theme>(
    THEME_STORAGE_KEY,
    initialTheme,
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (nextTheme: Theme): void => {
    applyTheme(nextTheme);
    storeTheme(nextTheme);
  };

  const toggleTheme = (): void => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider.');
  }

  return context;
}
