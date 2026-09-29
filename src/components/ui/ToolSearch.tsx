import { Search } from 'lucide-react';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router';
import { tools } from '../../tools/registry';

interface ToolSearchContextValue {
  openSearch: (trigger?: HTMLElement) => void;
}

interface ToolSearchProviderProps {
  children: ReactNode;
}

const ToolSearchContext = createContext<ToolSearchContextValue | null>(null);

export function ToolSearchProvider({ children }: ToolSearchProviderProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const openSearch = (trigger?: HTMLElement): void => {
    if (dialogRef.current?.open) {
      searchInputRef.current?.focus();
      return;
    }

    const activeElement = document.activeElement;
    previouslyFocusedRef.current =
      trigger ?? (activeElement instanceof HTMLElement ? activeElement : null);
    setQuery('');
    setIsOpen(true);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();

        if (dialogRef.current?.open) {
          searchInputRef.current?.focus();
          return;
        }

        const activeElement = document.activeElement;
        previouslyFocusedRef.current =
          activeElement instanceof HTMLElement ? activeElement : null;
        setQuery('');
        setIsOpen(true);
        return;
      }

      if (event.key === 'Escape' && dialogRef.current?.open) {
        event.preventDefault();
        dialogRef.current.close();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
    searchInputRef.current?.focus();
  }, [isOpen]);

  const handleClose = (): void => {
    setIsOpen(false);
    const previouslyFocused = previouslyFocusedRef.current;
    previouslyFocusedRef.current = null;

    if (previouslyFocused?.isConnected) {
      previouslyFocused.focus();
    }
  };

  const normalizedQuery = query.trim().toLowerCase();
  const matchingTools = normalizedQuery
    ? tools.filter((tool) =>
        [tool.name, tool.description, ...tool.keywords]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : tools;

  return (
    <ToolSearchContext.Provider value={{ openSearch }}>
      {children}
      <dialog
        aria-labelledby="tool-search-title"
        className="modal modal-middle px-4"
        onClose={handleClose}
        ref={dialogRef}
      >
        <div className="modal-box w-full max-w-xl overflow-hidden p-0">
          <h2 className="sr-only" id="tool-search-title">
            Search tools
          </h2>
          <label className="input h-14 w-full gap-3 rounded-b-none border-0 border-b border-base-300 px-5 shadow-none focus-within:outline-none">
            <Search
              aria-hidden="true"
              className="shrink-0 text-base-content/50"
              size={19}
              strokeWidth={1.8}
            />
            <input
              aria-label="Search tools"
              autoComplete="off"
              className="grow"
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search tools by name or keyword..."
              ref={searchInputRef}
              type="search"
              value={query}
            />
            <kbd className="kbd kbd-sm hidden sm:inline-flex">ESC</kbd>
          </label>

          <div
            aria-live="polite"
            className="max-h-[min(60vh,24rem)] overflow-y-auto p-2"
          >
            {matchingTools.length > 0 ? (
              <ul
                aria-label="Tool search results"
                className="menu menu-sm gap-1 p-0"
              >
                {matchingTools.map((tool) => (
                  <li key={tool.id}>
                    <Link
                      aria-label={tool.name}
                      className="items-start justify-between gap-4 rounded-box px-3 py-3"
                      onClick={() => dialogRef.current?.close()}
                      to={tool.path}
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{tool.name}</span>
                        <span className="mt-1 block text-xs leading-5 text-base-content/60">
                          {tool.description}
                        </span>
                      </span>
                      <span className="badge badge-ghost shrink-0 capitalize">
                        {tool.category}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-base-content/60">
                No tools found for “{query.trim()}”.
              </p>
            )}
          </div>
          <div className="border-t border-base-300 px-4 py-3 text-xs text-base-content/50">
            Press Escape to close
          </div>
        </div>
        <form className="modal-backdrop" method="dialog">
          <button aria-label="Close search" type="submit">
            Close
          </button>
        </form>
      </dialog>
    </ToolSearchContext.Provider>
  );
}

export function ToolSearchButton() {
  const searchContext = useContext(ToolSearchContext);

  return (
    <button
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K"
      aria-label="Search tools (Command or Control plus K)"
      className="btn h-12 w-full justify-between border border-base-300 bg-base-100 px-4 font-normal text-base-content/60 shadow-sm hover:border-base-content/30 hover:bg-base-100"
      onClick={(event) => searchContext?.openSearch(event.currentTarget)}
      type="button"
    >
      <span className="flex items-center gap-3">
        <Search aria-hidden="true" size={18} strokeWidth={1.8} />
        <span>Search tools</span>
      </span>
      <kbd className="kbd kbd-sm">⌘ / Ctrl + K</kbd>
    </button>
  );
}
