'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  clearWorkspace,
  emptyWorkspace,
  exportWorkspace,
  newId,
  parseWorkspaceImport,
  readWorkspace,
  recordRecent,
  toggleFavorite,
  writeWorkspace,
  WORKSPACE_EVENT,
  type Bookmark,
  type Snippet,
  type WorkspaceData,
} from './store';

export function useWorkspace() {
  const [data, setData] = useState<WorkspaceData>(emptyWorkspace);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      setData(readWorkspace(window.localStorage));
      setStorageError(null);
    } catch {
      setStorageError('This browser blocked local storage. Workspace features are unavailable.');
    }
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(WORKSPACE_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(WORKSPACE_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, [refresh]);

  const mutate = useCallback(
    (updater: (current: WorkspaceData) => WorkspaceData) => {
      try {
        const current = readWorkspace(window.localStorage);
        const next = updater(current);
        writeWorkspace(window.localStorage, next);
        setData(next);
        setStorageError(null);
        window.dispatchEvent(new Event(WORKSPACE_EVENT));
        return next;
      } catch {
        setStorageError('Could not save to local storage. The browser quota may be full.');
        return null;
      }
    },
    [],
  );

  const favorite = useCallback(
    (id: string) => {
      mutate((current) => ({ ...current, favorites: toggleFavorite(current.favorites, id) }));
    },
    [mutate],
  );

  const recordVisit = useCallback(
    (id: string) => {
      mutate((current) => ({ ...current, recents: recordRecent(current.recents, id) }));
    },
    [mutate],
  );

  const addSnippet = useCallback(
    (input: { title: string; language: string; code: string }) => {
      const now = Date.now();
      const snippet: Snippet = {
        id: newId(),
        title: input.title.trim() || 'Untitled snippet',
        language: input.language.trim() || 'text',
        code: input.code,
        createdAt: now,
        updatedAt: now,
      };
      mutate((current) => ({ ...current, snippets: [snippet, ...current.snippets] }));
      return snippet;
    },
    [mutate],
  );

  const deleteSnippet = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        snippets: current.snippets.filter((snippet) => snippet.id !== id),
      }));
    },
    [mutate],
  );

  const addBookmark = useCallback(
    (input: { title: string; url: string; note: string; tags: string[] }) => {
      const bookmark: Bookmark = {
        id: newId(),
        title: input.title.trim() || input.url,
        url: input.url.trim(),
        note: input.note.trim(),
        tags: input.tags,
        createdAt: Date.now(),
      };
      mutate((current) => ({ ...current, bookmarks: [bookmark, ...current.bookmarks] }));
      return bookmark;
    },
    [mutate],
  );

  const deleteBookmark = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        bookmarks: current.bookmarks.filter((bookmark) => bookmark.id !== id),
      }));
    },
    [mutate],
  );

  const removeFavorite = useCallback(
    (id: string) => {
      mutate((current) => ({
        ...current,
        favorites: current.favorites.filter((entry) => entry !== id),
      }));
    },
    [mutate],
  );

  const clearRecents = useCallback(() => {
    mutate((current) => ({ ...current, recents: [] }));
  }, [mutate]);

  const clearAll = useCallback(() => {
    try {
      clearWorkspace(window.localStorage);
      setData(emptyWorkspace());
      window.dispatchEvent(new Event(WORKSPACE_EVENT));
    } catch {
      setStorageError('Could not clear local storage.');
    }
  }, []);

  const exportData = useCallback(() => exportWorkspace(data), [data]);

  const importData = useCallback((text: string) => {
    const result = parseWorkspaceImport(text);
    if (!result.ok || !result.data) return result;
    try {
      writeWorkspace(window.localStorage, result.data);
      setData(result.data);
      window.dispatchEvent(new Event(WORKSPACE_EVENT));
      return result;
    } catch {
      return { ok: false, error: 'Could not write the imported data to local storage.' };
    }
  }, []);

  const favoriteIds = useMemo(() => new Set(data.favorites), [data.favorites]);

  return {
    data,
    ready,
    storageError,
    favoriteIds,
    favorite,
    recordVisit,
    addSnippet,
    deleteSnippet,
    addBookmark,
    deleteBookmark,
    removeFavorite,
    clearRecents,
    clearAll,
    exportData,
    importData,
  };
}
