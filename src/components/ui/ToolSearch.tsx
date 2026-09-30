import { Search } from 'lucide-react';
import {
  createContext,
  type KeyboardEvent as ReactKeyboardEvent,
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

  const getSearchResultLinks = (): HTMLAnchorElement[] =>
    Array.from(
      dialogRef.current?.querySelectorAll<HTMLAnchorElement>(
        '[data-tool-search-result]',
      ) ?? [],
    );

  const handleSearchInputKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
  ): void => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }

    const resultLinks = getSearchResultLinks();
    if (resultLinks.length === 0) {
      return;
    }

    event.preventDefault();
    const resultToFocus =
      event.key === 'ArrowDown'
        ? resultLinks[0]
        : resultLinks[resultLinks.length - 1];
    resultToFocus?.focus();
  };

  const handleResultKeyDown = (
    event: ReactKeyboardEvent<HTMLAnchorElement>,
    index: number,
  ): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const resultLinks = getSearchResultLinks();
      if (resultLinks.length === 0) {
        return;
      }

      event.preventDefault();
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex =
        (index + offset + resultLinks.length) % resultLinks.length;
      resultLinks[nextIndex]?.focus();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      event.currentTarget.click();
    }
  };

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
              onKeyDown={handleSearchInputKeyDown}
              placeholder="Search tools by name or keyword..."
              ref={searchInputRef}
              type="search"
              value={query}
            />
            <kbd className="kbd kbd-sm hidden sm:inline-flex">ESC</kbd>
          </label>

          <p className="sr-only" role="status">
            {matchingTools.length === 0
              ? 'No tools found'
              : `${matchingTools.length} ${matchingTools.length === 1 ? 'tool' : 'tools'} found`}
          </p>
          <div className="max-h-[min(60vh,24rem)] overflow-y-auto p-2">
            {matchingTools.length > 0 ? (
              <ul
                aria-label="Tool search results"
                className="menu menu-sm gap-1 p-0"
              >
                {matchingTools.map((tool, index) => (
                  <li key={tool.id}>
                    <Link
                      className="items-start justify-between gap-4 rounded-box px-3 py-3"
                      data-tool-search-result
                      onKeyDown={(event) => handleResultKeyDown(event, index)}
                      onClick={() => dialogRef.current?.close()}
                      to={tool.path}
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{tool.name}</span>
                        <span className="mt-1 block text-xs leading-5 text-base-content/75">
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
              <p className="px-4 py-8 text-center text-sm text-base-content/75">
                No tools found for “{query.trim()}”.
              </p>
            )}
          </div>
          <div className="border-t border-base-300 px-4 py-3 text-xs text-base-content/75">
            <kbd className="kbd kbd-xs">↑</kbd> /{' '}
            <kbd className="kbd kbd-xs">↓</kbd> to navigate,{' '}
            <kbd className="kbd kbd-xs">Enter</kbd> to open,{' '}
            <kbd className="kbd kbd-xs">Esc</kbd> to close
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
      className="btn h-12 w-full justify-between border border-base-300 bg-base-100 px-4 font-normal text-base-content/75 shadow-sm hover:border-base-content/30 hover:bg-base-100"
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
