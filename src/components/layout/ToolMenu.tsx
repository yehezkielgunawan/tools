import { ChevronDown } from 'lucide-react';
import { useRef } from 'react';
import { NavLink } from 'react-router';
import { toolCategories, tools } from '../../tools/registry';

export default function ToolMenu() {
  const menuRef = useRef<HTMLDetailsElement>(null);

  const closeMenu = (): void => {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  };

  return (
    <details className="dropdown dropdown-end" ref={menuRef}>
      <summary className="btn btn-ghost gap-1 px-3">
        Tools
        <ChevronDown aria-hidden="true" size={16} strokeWidth={1.8} />
      </summary>
      <div className="dropdown-content z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-box border border-base-300 bg-base-100 p-2 shadow-lg">
        <nav aria-label="Tool navigation" className="space-y-3">
          {toolCategories.map((category) => {
            const categoryTools = tools.filter(
              (tool) => tool.category === category.id,
            );

            return (
              <div key={category.id}>
                <p className="px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-base-content/45">
                  {category.label}
                </p>
                <ul className="menu menu-sm p-0">
                  {categoryTools.map((tool) => (
                    <li key={tool.id}>
                      <NavLink
                        className={({ isActive }) =>
                          isActive ? 'active font-medium' : undefined
                        }
                        onClick={closeMenu}
                        to={tool.path}
                      >
                        {tool.name}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>
    </details>
  );
}
