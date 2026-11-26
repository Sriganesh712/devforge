import { describe, it, expect } from 'vitest';
import {
  sanitizeWorkspace,
  parseWorkspaceImport,
  toggleFavorite,
  recordRecent,
  exportWorkspace,
  emptyWorkspace,
  MAX_FAVORITES,
  MAX_RECENTS,
  MAX_SNIPPETS,
  MAX_BOOKMARKS,
} from '@/features/workspace/store';

describe('workspace store', () => {
  describe('sanitizeWorkspace', () => {
    it('returns empty workspace for invalid input', () => {
      expect(sanitizeWorkspace(null)).toEqual(emptyWorkspace());
      expect(sanitizeWorkspace(undefined)).toEqual(emptyWorkspace());
      expect(sanitizeWorkspace('not an object')).toEqual(emptyWorkspace());
      expect(sanitizeWorkspace([1, 2, 3])).toEqual(emptyWorkspace());
    });

    it('sanitizes favorites', () => {
      const data = sanitizeWorkspace({
        favorites: ['a', 'b', 'a', '', 123, null],
      });
      expect(data.favorites).toEqual(['a', 'b']);
    });

    it('caps favorites at MAX_FAVORITES', () => {
      const many = Array.from({ length: MAX_FAVORITES + 50 }, (_, i) => `id-${i}`);
      const data = sanitizeWorkspace({ favorites: many });
      expect(data.favorites.length).toBe(MAX_FAVORITES);
    });

    it('sanitizes recents', () => {
      const data = sanitizeWorkspace({
        recents: [
          { id: 'a', at: 1000 },
          { id: 'b', at: 2000 },
          { id: 'a', at: 3000 }, // duplicate, should be deduplicated
          { at: 4000 }, // missing id
          'not a record',
        ],
      });
      expect(data.recents.length).toBe(2);
      expect(data.recents[0].id).toBe('a');
      expect(data.recents[1].id).toBe('b');
    });

    it('caps recents at MAX_RECENTS', () => {
      const many = Array.from({ length: MAX_RECENTS + 10 }, (_, i) => ({ id: `id-${i}`, at: i }));
      const data = sanitizeWorkspace({ recents: many });
      expect(data.recents.length).toBe(MAX_RECENTS);
    });

    it('sanitizes snippets', () => {
      const data = sanitizeWorkspace({
        snippets: [
          {
            id: 's1',
            title: 'Snippet',
            code: 'code',
            language: 'js',
            createdAt: 1000,
          },
          { id: 's2', title: 'No code', language: 'js', createdAt: 1000 }, // missing code
        ],
      });
      expect(data.snippets.length).toBe(1);
      expect(data.snippets[0].id).toBe('s1');
    });

    it('truncates snippet fields', () => {
      const data = sanitizeWorkspace({
        snippets: [
          {
            id: 's1',
            title: 'x'.repeat(200),
            code: 'y'.repeat(300000),
            language: 'z'.repeat(100),
            createdAt: 1000,
          },
        ],
      });
      expect(data.snippets[0].title.length).toBe(120);
      expect(data.snippets[0].code.length).toBe(200_000);
      expect(data.snippets[0].language.length).toBe(40);
    });

    it('sanitizes bookmarks', () => {
      const data = sanitizeWorkspace({
        bookmarks: [
          { id: 'b1', title: 'Title', url: 'https://example.com', tags: ['a', 'b'], createdAt: 1000 },
          { id: 'b2', title: 'Bad', url: 'not-a-url', tags: ['c'], createdAt: 1000 }, // invalid url
        ],
      });
      expect(data.bookmarks.length).toBe(1);
      expect(data.bookmarks[0].id).toBe('b1');
    });

    it('truncates bookmark fields', () => {
      const data = sanitizeWorkspace({
        bookmarks: [
          {
            id: 'b1',
            title: 'x'.repeat(200),
            url: 'https://example.com',
            note: 'y'.repeat(2000),
            tags: Array.from({ length: 20 }, (_, i) => `tag${i}`),
            createdAt: 1000,
          },
        ],
      });
      expect(data.bookmarks[0].title.length).toBe(160);
      expect(data.bookmarks[0].note.length).toBe(1000);
      expect(data.bookmarks[0].tags.length).toBe(12);
    });
  });

  describe('parseWorkspaceImport', () => {
    it('accepts valid export', () => {
      const data = emptyWorkspace();
      data.favorites = ['tool-1'];
      const text = exportWorkspace(data);
      const result = parseWorkspaceImport(text);
      expect(result.ok).toBe(true);
      if (result.ok && result.data) {
        expect(result.data.favorites).toEqual(['tool-1']);
      }
    });

    it('rejects invalid JSON', () => {
      const result = parseWorkspaceImport('not json');
      expect(result.ok).toBe(false);
      expect(result.error).toContain('valid JSON');
    });

    it('rejects non-object', () => {
      const result = parseWorkspaceImport('[1,2,3]');
      expect(result.ok).toBe(false);
    });

    it('rejects wrong app', () => {
      const result = parseWorkspaceImport(JSON.stringify({ app: 'other', version: 1, favorites: ['a'] }));
      expect(result.ok).toBe(false);
      expect(result.error).toContain('DevForge');
    });

    it('rejects wrong version', () => {
      const result = parseWorkspaceImport(JSON.stringify({ app: 'devforge', version: 2, favorites: ['a'] }));
      expect(result.ok).toBe(false);
      expect(result.error).toContain('version');
    });

    it('rejects empty data', () => {
      const result = parseWorkspaceImport(JSON.stringify({ app: 'devforge', version: 1 }));
      expect(result.ok).toBe(false);
    });
  });

  describe('toggleFavorite', () => {
    it('adds a favorite', () => {
      const result = toggleFavorite([], 'tool-1');
      expect(result).toEqual(['tool-1']);
    });

    it('removes a favorite', () => {
      const result = toggleFavorite(['tool-1', 'tool-2'], 'tool-1');
      expect(result).toEqual(['tool-2']);
    });

    it('keeps new favorite first', () => {
      const result = toggleFavorite(['existing'], 'new');
      expect(result[0]).toBe('new');
    });
  });

  describe('recordRecent', () => {
    it('records a recent entry', () => {
      const result = recordRecent([], 'tool-1');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('tool-1');
      expect(typeof result[0].at).toBe('number');
    });

    it('moves existing entry to front', () => {
      const now = Date.now();
      const recents = [{ id: 'old', at: now - 1000 }, { id: 'new', at: now }];
      const result = recordRecent(recents, 'old');
      expect(result[0].id).toBe('old');
      expect(result.length).toBe(2);
    });

    it('caps recents at MAX_RECENTS', () => {
      const many = Array.from({ length: MAX_RECENTS + 10 }, (_, i) => ({ id: `id-${i}`, at: i }));
      const result = recordRecent(many, 'new');
      expect(result.length).toBe(MAX_RECENTS);
    });
  });

  describe('exportWorkspace', () => {
    it('produces valid export JSON', () => {
      const data = emptyWorkspace();
      data.favorites = ['tool-1'];
      const text = exportWorkspace(data);
      const parsed = JSON.parse(text);
      expect(parsed.app).toBe('devforge');
      expect(parsed.version).toBe(1);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.favorites).toEqual(['tool-1']);
    });
  });
});
