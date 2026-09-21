import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../app/ThemeProvider';

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'light' ? 'dark' : 'light';
  const ThemeIcon = theme === 'light' ? Moon : Sun;

  return (
    <button
      aria-label={`Switch to ${nextTheme} mode`}
      className={`btn btn-ghost ${className}`.trim()}
      onClick={toggleTheme}
      type="button"
    >
      <ThemeIcon aria-hidden="true" size={18} strokeWidth={1.8} />
      {className.includes('justify-start') ? (
        <span>{theme === 'light' ? 'Light mode' : 'Dark mode'}</span>
      ) : null}
    </button>
  );
}
