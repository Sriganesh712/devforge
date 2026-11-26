'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CornerDownLeft, Search } from 'lucide-react';
import { rankTools } from '@/packages/tool-sdk/search';
import type { CatalogEntry } from '@/packages/tool-sdk/public';
import { Kbd } from '@/packages/ui/surface';
import { cn } from '@/lib/utils';

export function SearchDialog({ catalog }: { catalog: readonly CatalogEntry[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const results = useMemo(() => rankTools(catalog, query, 12), [catalog, query]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery('');
      setActive(0);
      dialog.showModal();
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const select = (entry: CatalogEntry) => {
    setOpen(false);
    router.push(`/tools/${entry.category}/${entry.id}`);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, Math.max(0, results.length - 1)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && results[active]) {
      event.preventDefault();
      select(results[active].tool);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-40 items-center gap-2 rounded-control border border-line-strong bg-surface px-2.5 text-xs text-muted transition-colors hover:border-line-strong hover:bg-surface-2 sm:w-56"
        aria-label="Search tools"
      >
        <Search className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="flex-1 truncate text-left">Search tools</span>
        <Kbd>Ctrl K</Kbd>
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onCancel={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
        className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 backdrop:bg-ink/30 backdrop:backdrop-blur-[2px]"
        aria-label="Search tools"
      >
        <div
          className="mx-auto mt-[10vh] w-[min(640px,calc(100%-24px))] overflow-hidden rounded-panel border border-line-strong bg-surface shadow-raised"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center gap-2 border-b border-line px-3.5">
            <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Search by tool, tag or alias…"
              className="h-12 w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              aria-label="Search query"
              role="combobox"
              aria-expanded="true"
              aria-controls="search-results"
              aria-activedescendant={results[active] ? `search-option-${active}` : undefined}
              autoComplete="off"
              spellCheck={false}
            />
            <Kbd>Esc</Kbd>
          </div>

          <div
            ref={listRef}
            id="search-results"
            role="listbox"
            aria-label="Tool results"
            className="max-h-[min(56vh,420px)] overflow-y-auto p-1.5"
          >
            {results.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-sm font-medium text-ink">No tools match “{query}”</p>
                <p className="mt-1 text-xs text-muted">Try a format, a tag or an alias such as “json”.</p>
              </div>
            ) : (
              results.map(({ tool }, index) => (
                <button
                  key={tool.id}
                  type="button"
                  id={`search-option-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => select(tool)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors',
                    index === active ? 'bg-surface-2' : 'hover:bg-surface-2/60',
                  )}
                >
                  <span className="w-6 shrink-0 font-mono text-[10px] text-muted">
                    {tool.categoryIndex}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {tool.name}
                    </span>
                    <span className="block truncate text-xs text-muted">{tool.summary}</span>
                  </span>
                  <span className="hidden shrink-0 text-[11px] text-muted sm:block">
                    {tool.categoryName}
                  </span>
                  {index === active ? (
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                  ) : null}
                </button>
              ))
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-line px-3.5 py-2 text-[11px] text-muted">
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↵</Kbd> open
            </span>
            <span className="ml-auto font-mono">{results.length} tools</span>
          </div>
        </div>
      </dialog>
    </>
  );
}
