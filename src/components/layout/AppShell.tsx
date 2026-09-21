import { Menu } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import SidebarNavigation from './SidebarNavigation';
import ThemeToggle from './ThemeToggle';

interface AppShellProps {
  children: ReactNode;
}

const DRAWER_ID = 'app-navigation-drawer';
const DRAWER_PANEL_ID = 'app-navigation-panel';
const DESKTOP_BREAKPOINT = 1024;

export default function AppShell({ children }: AppShellProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const wasDrawerOpenRef = useRef(false);
  const isDesktopRef = useRef(false);

  const closeDrawer = (): void => {
    setIsDrawerOpen(false);
  };

  useEffect(() => {
    if (!isDrawerOpen) {
      if (wasDrawerOpenRef.current && !isDesktopRef.current) {
        menuButtonRef.current?.focus();
      }
      wasDrawerOpenRef.current = false;
      return;
    }

    wasDrawerOpenRef.current = true;
    const firstFocusable = drawerRef.current?.querySelector<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setIsDrawerOpen(false);
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = drawerRef.current
        ? Array.from(
            drawerRef.current.querySelectorAll<HTMLElement>(
              'a[href], button:not([disabled])',
            ),
          )
        : [];

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!firstElement || !lastElement) {
        return;
      }

      if (!drawerRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        firstElement.focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  useEffect(() => {
    const handleResize = (): void => {
      const isDesktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      isDesktopRef.current = isDesktop;

      if (isDesktop) {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="drawer min-h-screen bg-base-200 text-base-content lg:drawer-open">
      <input
        aria-hidden="true"
        checked={isDrawerOpen}
        className="drawer-toggle"
        id={DRAWER_ID}
        onChange={(event) => {
          const nextIsDrawerOpen = event.currentTarget.checked;
          setIsDrawerOpen(nextIsDrawerOpen);
        }}
        tabIndex={-1}
        type="checkbox"
      />

      <div
        className="drawer-content flex min-h-screen min-w-0 flex-col"
        inert={isDrawerOpen || undefined}
      >
        <header className="navbar sticky top-0 z-30 border-b border-base-300 bg-base-100/90 px-4 backdrop-blur lg:hidden">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                aria-controls={DRAWER_PANEL_ID}
                aria-expanded={isDrawerOpen}
                aria-label={
                  isDrawerOpen ? 'Close navigation' : 'Open navigation'
                }
                className="btn btn-ghost btn-square shrink-0"
                onClick={() => setIsDrawerOpen(true)}
                ref={menuButtonRef}
                type="button"
              >
                <Menu aria-hidden="true" size={20} strokeWidth={1.8} />
              </button>
              <Link
                aria-label="Home"
                className="flex min-w-0 items-center gap-2 text-sm font-semibold tracking-tight no-underline"
                to="/"
              >
                <img
                  alt=""
                  aria-hidden="true"
                  className="size-7 shrink-0"
                  src="/yehezgun-tools-favicon.svg"
                />
                <span className="truncate">Yehezgun Tools</span>
              </Link>
            </div>
            <ThemeToggle className="btn-square shrink-0" />
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <div className="drawer-side z-40" ref={drawerRef}>
        <label
          aria-label="Close navigation"
          className="drawer-overlay"
          htmlFor={DRAWER_ID}
        />
        <SidebarNavigation id={DRAWER_PANEL_ID} onNavigate={closeDrawer} />
      </div>
    </div>
  );
}
