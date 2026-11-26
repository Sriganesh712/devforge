export const WORKSPACE_KEYS = {
  favorites: 'df:favorites',
  recents: 'df:recents',
  snippets: 'df:snippets',
  bookmarks: 'df:bookmarks',
} as const;

export const WORKSPACE_EVENT = 'df:workspace-change';

export interface RecentEntry {
  id: string;
  at: number;
}

export interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  createdAt: number;
  updatedAt: number;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  note: string;
  tags: string[];
  createdAt: number;
}

export interface WorkspaceData {
  favorites: string[];
  recents: RecentEntry[];
  snippets: Snippet[];
  bookmarks: Bookmark[];
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  data?: WorkspaceData;
}

export const MAX_RECENTS = 20;
export const MAX_FAVORITES = 200;
export const MAX_SNIPPETS = 500;
export const MAX_BOOKMARKS = 500;

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyWorkspace(): WorkspaceData {
  return { favorites: [], recents: [], snippets: [], bookmarks: [] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function sanitizeWorkspace(value: unknown): WorkspaceData {
  if (!isRecord(value)) return emptyWorkspace();
  const favorites = Array.isArray(value.favorites)
    ? [...new Set(value.favorites.filter((id): id is string => typeof id === 'string' && id.length > 0))].slice(
        0,
        MAX_FAVORITES,
      )
    : [];
  const recents = Array.isArray(value.recents)
    ? value.recents
        .filter(
          (entry): entry is RecentEntry =>
            isRecord(entry) &&
            typeof entry.id === 'string' &&
            typeof entry.at === 'number' &&
            Number.isFinite(entry.at),
        )
        .filter((entry, index, list) => list.findIndex((candidate) => candidate.id === entry.id) === index)
        .slice(0, MAX_RECENTS)
    : [];
  const snippets = Array.isArray(value.snippets)
    ? value.snippets
        .filter(
          (entry): entry is Snippet =>
            isRecord(entry) &&
            typeof entry.id === 'string' &&
            typeof entry.title === 'string' &&
            typeof entry.code === 'string' &&
            typeof entry.language === 'string' &&
            typeof entry.createdAt === 'number',
        )
        .map((entry) => ({
          ...entry,
          title: entry.title.slice(0, 120),
          code: entry.code.slice(0, 200_000),
          language: entry.language.slice(0, 40),
          updatedAt: typeof entry.updatedAt === 'number' ? entry.updatedAt : entry.createdAt,
        }))
        .slice(0, MAX_SNIPPETS)
    : [];
  const bookmarks = Array.isArray(value.bookmarks)
    ? value.bookmarks
        .filter(
          (entry): entry is Bookmark =>
            isRecord(entry) &&
            typeof entry.id === 'string' &&
            typeof entry.title === 'string' &&
            typeof entry.url === 'string' &&
            /^https?:\/\//i.test(entry.url),
        )
        .map((entry) => ({
          ...entry,
          title: entry.title.slice(0, 160),
          note: typeof entry.note === 'string' ? entry.note.slice(0, 1000) : '',
          tags: Array.isArray(entry.tags)
            ? entry.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 12)
            : [],
          createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : Date.now(),
        }))
        .slice(0, MAX_BOOKMARKS)
    : [];
  return { favorites, recents, snippets, bookmarks };
}

function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readWorkspace(storage: Storage): WorkspaceData {
  const combined = {
    favorites: readJson(storage, WORKSPACE_KEYS.favorites),
    recents: readJson(storage, WORKSPACE_KEYS.recents),
    snippets: readJson(storage, WORKSPACE_KEYS.snippets),
    bookmarks: readJson(storage, WORKSPACE_KEYS.bookmarks),
  };
  return sanitizeWorkspace(combined);
}

export function writeWorkspace(storage: Storage, data: WorkspaceData): void {
  storage.setItem(WORKSPACE_KEYS.favorites, JSON.stringify(data.favorites));
  storage.setItem(WORKSPACE_KEYS.recents, JSON.stringify(data.recents));
  storage.setItem(WORKSPACE_KEYS.snippets, JSON.stringify(data.snippets));
  storage.setItem(WORKSPACE_KEYS.bookmarks, JSON.stringify(data.bookmarks));
}

export function toggleFavorite(favorites: readonly string[], id: string): string[] {
  return favorites.includes(id)
    ? favorites.filter((entry) => entry !== id)
    : [id, ...favorites].slice(0, MAX_FAVORITES);
}

export function recordRecent(recents: readonly RecentEntry[], id: string, at = Date.now()): RecentEntry[] {
  return [{ id, at }, ...recents.filter((entry) => entry.id !== id)].slice(0, MAX_RECENTS);
}

export function exportWorkspace(data: WorkspaceData): string {
  return JSON.stringify(
    {
      app: 'devforge',
      version: 1,
      exportedAt: new Date().toISOString(),
      favorites: data.favorites,
      recents: data.recents,
      snippets: data.snippets,
      bookmarks: data.bookmarks,
    },
    null,
    2,
  );
}

export function parseWorkspaceImport(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'The file is not valid JSON.' };
  }
  if (!isRecord(parsed)) return { ok: false, error: 'The file does not contain a workspace object.' };
  if (parsed.app !== 'devforge') {
    return { ok: false, error: 'This file was not exported by DevForge.' };
  }
  if (parsed.version !== 1) {
    return { ok: false, error: `Unsupported workspace version: ${String(parsed.version)}.` };
  }
  const data = sanitizeWorkspace(parsed);
  if (
    data.favorites.length === 0 &&
    data.recents.length === 0 &&
    data.snippets.length === 0 &&
    data.bookmarks.length === 0
  ) {
    return { ok: false, error: 'The file contains no workspace data.' };
  }
  return { ok: true, data };
}

export function clearWorkspace(storage: Storage): void {
  for (const key of Object.values(WORKSPACE_KEYS)) storage.removeItem(key);
}
