'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, Clock, Code2, Link as LinkIcon, Trash2, Upload } from 'lucide-react';
import { useWorkspace } from '@/features/workspace/use-workspace';
import { Button } from '@/packages/ui/button';
import { CopyButton, DownloadButton } from '@/packages/ui/copy-button';
import { Field, Input, Select, Textarea } from '@/packages/ui/field';
import { Badge, Divider, EmptyState, Panel, PanelHeader } from '@/packages/ui/surface';
import { PageHeader } from '@/packages/ui/page';
import { AlertTriangle } from 'lucide-react';

export default function WorkspacePage() {
  const {
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
  } = useWorkspace();

  const [snippetTitle, setSnippetTitle] = useState('');
  const [snippetLanguage, setSnippetLanguage] = useState('text');
  const [snippetCode, setSnippetCode] = useState('');
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkUrl, setBookmarkUrl] = useState('');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [bookmarkTags, setBookmarkTags] = useState('');
  const [importText, setImportText] = useState('');

  const addSnippetHandler = () => {
    if (!snippetTitle.trim() || !snippetCode.trim()) return;
    addSnippet({ title: snippetTitle, language: snippetLanguage, code: snippetCode });
    setSnippetTitle('');
    setSnippetCode('');
  };

  const addBookmarkHandler = () => {
    if (!bookmarkTitle.trim() || !bookmarkUrl.trim()) return;
    addBookmark({
      title: bookmarkTitle,
      url: bookmarkUrl,
      note: bookmarkNote,
      tags: bookmarkTags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setBookmarkTitle('');
    setBookmarkUrl('');
    setBookmarkNote('');
    setBookmarkTags('');
  };

  const handleImport = () => {
    const result = importData(importText);
    if (!result.ok) {
      alert(result.error || 'Import failed.');
    }
    setImportText('');
  };

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <Panel className="p-8">
          <p className="text-sm text-muted">Loading workspace…</p>
        </Panel>
      </div>
    );
  }

  if (storageError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Panel className="p-6 max-w-md w-full border border-danger/30 bg-danger/5">
          <PanelHeader title="Storage unavailable" description={storageError} />
          <p className="mt-3 text-xs text-muted">
            Workspace data is stored in your browser's local storage. If it's blocked,
            favorites, recents, snippets, and bookmarks won't be saved.
          </p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Developer Workspace"
        description="Your snippets, bookmarks, favorites and recent tools stay in this browser. Nothing leaves your machine."
        actions={
          <div className="flex items-center gap-2">
            <DownloadButton value={exportData()} filename="devforge-workspace.json" label="Export" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('import-file')?.click()}
            >
              <Upload className="h-3.5 w-3.5" aria-hidden />
              Import
            </Button>
            <input
              id="import-file"
              type="file"
              accept=".json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  setImportText(reader.result as string);
                  handleImport();
                };
                reader.readAsText(file);
              }}
            />
          </div>
        }
      />

      {storageError ? (
        <div className="rounded-card border border-warn/25 bg-warn/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" aria-hidden />
            <p className="text-xs text-warn">{storageError}</p>
          </div>
        </div>
      ) : null}

      {/* Favorites */}
      <Panel className="flex flex-col">
        <PanelHeader
          title="Favorites"
          description={favoriteIds.size === 0 ? 'No favorited tools yet.' : 'Tools you saved for quick access.'}
          actions={
            favoriteIds.size > 0 ? <Badge>{favoriteIds.size}</Badge> : null
          }
        />
        {favoriteIds.size === 0 ? (
          <EmptyState title="No favorites" description="Open a tool page and choose Favorite to save it here." />
        ) : (
          <div className="divide-y divide-line p-4">
            {Array.from(favoriteIds).map((toolId) => (
              <div key={toolId} className="flex items-center justify-between gap-3 px-2 py-2.5 hover:bg-surface-2 rounded-control transition-colors">
                <Link
                  href={`/tools/${toolId.split('-')[0]}/${toolId}`}
                  className="flex items-center gap-2 flex-1 text-ink hover:text-accent"
                >
                  <Star className="h-3.5 w-3.5 fill-accent text-accent" aria-hidden />
                  <span className="text-[13px]">{toolId}</span>
                </Link>
                <Button
                  type="button"
                  variant="danger"
                  size="icon"
                  onClick={() => removeFavorite(toolId)}
                  title="Remove from favorites"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Recents */}
      <Panel className="flex flex-col">
        <PanelHeader
          title="Recent tools"
          description={data.recents.length === 0 ? 'No recent activity.' : `Last ${data.recents.length} tool(s) opened.`}
          actions={
            data.recents.length > 0 ? (
              <div className="flex items-center gap-2">
                <Badge>{data.recents.length}</Badge>
                <Button type="button" variant="ghost" size="sm" onClick={clearRecents}>
                  Clear
                </Button>
              </div>
            ) : null
          }
        />
        {data.recents.length === 0 ? (
          <EmptyState title="No recent tools" description="Open tools to see them appear here." />
        ) : (
          <div className="divide-y divide-line p-4">
            {data.recents.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 px-2 py-2.5 hover:bg-surface-2 rounded-control transition-colors">
                <Link
                  href={`/tools/${entry.id.split('-')[0]}/${entry.id}`}
                  className="flex items-center gap-2 flex-1 text-ink hover:text-accent"
                >
                  <Clock className="h-3.5 w-3.5 text-muted" aria-hidden />
                  <span className="text-[13px]">{entry.id}</span>
                </Link>
                <span className="text-[11px] font-mono text-muted">
                  {new Date(entry.at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Snippets */}
      <Panel className="flex flex-col">
        <PanelHeader
          title="Code snippets"
          description={data.snippets.length === 0 ? 'No snippets saved.' : `Snippet${data.snippets.length === 1 ? '' : 's'} saved.`}
          actions={data.snippets.length > 0 ? <Badge>{data.snippets.length}</Badge> : null}
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Field label="Title">
              <Input
                value={snippetTitle}
                placeholder="e.g. API helper"
                onChange={(event) => setSnippetTitle(event.target.value)}
              />
            </Field>
            <Field label="Language">
              <Select value={snippetLanguage} onChange={(event) => setSnippetLanguage(event.target.value)}>
                <option value="text">Text</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="json">JSON</option>
                <option value="sql">SQL</option>
                <option value="yaml">YAML</option>
                <option value="markdown">Markdown</option>
                <option value="bash">Bash</option>
              </Select>
            </Field>
            <Field label="Code">
              <Textarea
                value={snippetCode}
                placeholder="Paste your code here"
                rows={4}
                onChange={(event) => setSnippetCode(event.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="primary"
              onClick={addSnippetHandler}
              disabled={!snippetTitle.trim() || !snippetCode.trim()}
            >
              <Code2 className="h-3.5 w-3.5" aria-hidden />
              Add snippet
            </Button>
          </div>
          <div className="flex flex-col">
            {data.snippets.length === 0 ? (
              <EmptyState title="No snippets" description="Add a code snippet to save it here." />
            ) : (
              <div className="divide-y divide-line p-4">
                {data.snippets.map((snippet) => (
                  <div key={snippet.id} className="px-2 py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-mono text-muted">{snippet.language}</span>
                      <span className="text-[11px] font-mono text-muted">
                        {new Date(snippet.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="overflow-hidden rounded-card border border-line bg-surface-2/50 p-2.5">
                      <pre className="overflow-auto font-mono text-[11px] text-ink-2 break-all max-h-32">
                        {snippet.code.slice(0, 200)}{snippet.code.length > 200 ? '…' : ''}
                      </pre>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => deleteSnippet(snippet.id)}
                      className="mt-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Panel>

      {/* Bookmarks */}
      <Panel className="flex flex-col">
        <PanelHeader
          title="Bookmarks"
          description={data.bookmarks.length === 0 ? 'No bookmarks saved.' : `Bookmark${data.bookmarks.length === 1 ? '' : 's'} saved.`}
          actions={data.bookmarks.length > 0 ? <Badge>{data.bookmarks.length}</Badge> : null}
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Field label="Title">
              <Input
                value={bookmarkTitle}
                placeholder="e.g. MDN Web Docs"
                onChange={(event) => setBookmarkTitle(event.target.value)}
              />
            </Field>
            <Field label="URL">
              <Input
                value={bookmarkUrl}
                placeholder="https://example.com"
                onChange={(event) => setBookmarkUrl(event.target.value)}
              />
            </Field>
            <Field label="Note (optional)">
              <Input
                value={bookmarkNote}
                placeholder="Why you saved this"
                onChange={(event) => setBookmarkNote(event.target.value)}
              />
            </Field>
            <Field label="Tags (comma separated)">
              <Input
                value={bookmarkTags}
                placeholder="docs, reference"
                onChange={(event) => setBookmarkTags(event.target.value)}
              />
            </Field>
            <Button
              type="button"
              variant="primary"
              onClick={addBookmarkHandler}
              disabled={!bookmarkTitle.trim() || !bookmarkUrl.trim()}
            >
              <LinkIcon className="h-3.5 w-3.5" aria-hidden />
              Add bookmark
            </Button>
          </div>
          <div className="flex flex-col">
            {data.bookmarks.length === 0 ? (
              <EmptyState title="No bookmarks" description="Add a bookmark to save it here." />
            ) : (
              <div className="divide-y divide-line p-4">
                {data.bookmarks.map((bookmark) => (
                  <div key={bookmark.id} className="px-2 py-2.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Link
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[13px] font-medium text-ink hover:text-accent truncate"
                        title={bookmark.title}
                      >
                        {bookmark.title}
                      </Link>
                      <Button
                        type="button"
                        variant="danger"
                        size="icon"
                        onClick={() => deleteBookmark(bookmark.id)}
                        title="Delete bookmark"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted">
                      <span className="font-mono truncate max-w-[200px]" title={bookmark.url}>
                        {bookmark.url}
                      </span>
                      {bookmark.note && (
                        <span className="truncate max-w-[200px]" title={bookmark.note}>
                          {bookmark.note}
                        </span>
                      )}
                      {bookmark.tags.length > 0 && (
                        <span className="flex gap-1">
                          {bookmark.tags.map((tag) => (
                            <Badge key={tag}>{tag}</Badge>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Divider />

      {/* Danger zone */}
      <Panel className="flex flex-col">
        <PanelHeader title="Danger zone" description="These actions cannot be undone." />
        <div className="p-4">
          <Button
            type="button"
            variant="danger"
            onClick={clearAll}
            disabled={
              data.favorites.length === 0 &&
              data.recents.length === 0 &&
              data.snippets.length === 0 &&
              data.bookmarks.length === 0
            }
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            Clear all workspace data
          </Button>
          <p className="mt-2 text-[11px] text-muted">
            Removes favorites, recents, snippets and bookmarks from local storage.
          </p>
        </div>
      </Panel>
    </div>
  );
}
