import { Moon, Sun } from 'lucide-react';
import { Link } from 'react-router';
import { useTheme } from '../../app/ThemeProvider';
import ToolMenu from './ToolMenu';

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'light' ? 'dark' : 'light';
  const ThemeIcon = theme === 'light' ? Moon : Sun;

  return (
    <header className="navbar border-b border-base-300 bg-base-100/90 px-4 backdrop-blur sm:px-6">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
        <Link
          className="link link-hover flex min-w-0 items-center gap-2 text-base font-semibold tracking-tight no-underline"
          to="/"
        >
          <img
            alt=""
            aria-hidden="true"
            className="size-8 shrink-0"
            src="/yehezgun-tools-favicon.svg"
          />
          <span className="truncate">Yehezgun Tools</span>
        </Link>
        <div className="flex items-center gap-1">
          <ToolMenu />
          <button
            aria-label={`Switch to ${nextTheme} mode`}
            className="btn btn-ghost btn-square"
            onClick={toggleTheme}
            type="button"
          >
            <ThemeIcon aria-hidden="true" size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </header>
  );
}
