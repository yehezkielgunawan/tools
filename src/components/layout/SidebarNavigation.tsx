import { Braces, Grid2X2, MessageCircle } from 'lucide-react';
import { Link, NavLink } from 'react-router';
import { toolCategories, tools } from '../../tools/registry';
import ThemeToggle from './ThemeToggle';

interface SidebarNavigationProps {
  id?: string;
  onNavigate?: () => void;
}

const icons = {
  braces: Braces,
  'message-circle': MessageCircle,
} as const;

export default function SidebarNavigation({
  id,
  onNavigate,
}: SidebarNavigationProps) {
  return (
    <aside
      aria-label="Tool navigation"
      className="flex min-h-full w-72 flex-col border-r border-base-300 bg-base-100 px-4 py-5"
      id={id}
    >
      <Link
        className="mb-8 flex items-center gap-3 rounded-box px-2 py-1 text-base font-semibold tracking-tight no-underline transition-colors hover:bg-base-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        onClick={onNavigate}
        to="/"
      >
        <img
          alt=""
          aria-hidden="true"
          className="size-9 shrink-0"
          src="/yehezgun-tools-favicon.svg"
        />
        <span>Yehezgun Tools</span>
      </Link>

      <nav aria-label="Workspace navigation" className="flex-1">
        <ul className="menu menu-md gap-1 p-0">
          <li>
            <NavLink
              className={({ isActive }) =>
                isActive ? 'active font-semibold' : undefined
              }
              end
              onClick={onNavigate}
              to="/"
            >
              <Grid2X2 aria-hidden="true" size={17} strokeWidth={1.8} />
              All tools
            </NavLink>
          </li>
        </ul>

        <div className="mt-8 space-y-6">
          {toolCategories.map((category) => {
            const categoryTools = tools.filter(
              (tool) => tool.category === category.id,
            );

            return (
              <section
                aria-labelledby={`${category.id}-sidebar`}
                key={category.id}
              >
                <h2
                  className="px-3 pb-2 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-base-content/60"
                  id={`${category.id}-sidebar`}
                >
                  {category.label}
                </h2>
                <ul className="menu menu-sm gap-1 p-0">
                  {categoryTools.map((tool) => {
                    const Icon = icons[tool.icon];

                    return (
                      <li key={tool.id}>
                        <NavLink
                          className={({ isActive }) =>
                            isActive ? 'active font-semibold' : undefined
                          }
                          onClick={onNavigate}
                          to={tool.path}
                        >
                          <Icon
                            aria-hidden="true"
                            size={16}
                            strokeWidth={1.8}
                          />
                          {tool.name}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </nav>

      <div className="mt-8 border-t border-base-300 pt-4">
        <ThemeToggle className="w-full justify-start gap-3 px-3" />
        <p className="mt-4 px-3 text-xs leading-5 text-base-content/60">
          A personal workspace for the tools I reach for most.
        </p>
      </div>
    </aside>
  );
}
