'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowRight, Clock, Copy, Shield, Terminal } from 'lucide-react';
import type { ToolUiProps } from './types';
import { CodeBlock, CustomPanel, EmptyResult, ToolErrorNote } from './shared';
import { Badge } from '@/packages/ui/surface';
import { Button } from '@/packages/ui/button';
import { CopyButton } from '@/packages/ui/copy-button';
import { Input } from '@/packages/ui/field';
import { Field } from '@/packages/ui/field';
import { Select } from '@/packages/ui/field';
import { Textarea } from '@/packages/ui/field';
import { cn } from '@/lib/utils';
import { parseRepoUrl } from '@/tools/git-tools/graph';
import { parseHeaderLines, redactHeaders } from '@/packages/core/http';

const SECRET_HEADER = /authorization|cookie|token|secret|api[-_]?key|x-api-key/i;

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : 'The request could not be completed.';
}

function humanMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/* ------------------------------------------------------------------ */
/* HTTP request builder                                               */
/* ------------------------------------------------------------------ */

export function HttpUi({ input, setInput, run, reset }: ToolUiProps) {
  const [method, setMethod] = useState('GET');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    statusText: string;
    url: string;
    method: string;
    durationMs: number;
    headers: Array<{ name: string; value: string }>;
    body: string;
    truncated: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const send = useCallback(async () => {
    const url = input.trim();
    if (!url) {
      setError('Enter a request URL.');
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      setError('Use an absolute URL beginning with http:// or https://.');
      return;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      setError('Only http and https requests are supported.');
      return;
    }

    if (controllerRef.current) controllerRef.current.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    const headerList = parseHeaderLines(headers);
    if (headerList.errors.length > 0) {
      setError(headerList.errors.join(' '));
      return;
    }

    const fetchHeaders: Record<string, string> = {};
    for (const header of headerList.headers) {
      fetchHeaders[header.name] = header.value;
    }

    setSending(true);
    setError(null);
    setResponse(null);

    const start = performance.now();
    try {
      const fetchOptions: RequestInit = {
        method,
        headers: fetchHeaders,
        signal: controller.signal,
        cache: 'no-store',
      };
      if (method !== 'GET' && method !== 'HEAD' && body !== '') {
        fetchOptions.body = body;
      }

      const res = await fetch(parsed.toString(), fetchOptions);
      const durationMs = performance.now() - start;

      const responseText = await res.text();
      const truncated = responseText.length > 200_000;
      const bodyToShow = truncated ? responseText.slice(0, 200_000) + '\n…[truncated]' : responseText;

      const responseHeaders = Array.from(res.headers.entries()).map(([name, value]) => ({ name, value }));

      if (controller.signal.aborted) return;

      setResponse({
        status: res.status,
        statusText: res.statusText,
        url: parsed.toString(),
        method,
        durationMs,
        headers: responseHeaders,
        body: bodyToShow,
        truncated,
      });
    } catch (caught) {
      if (controller.signal.aborted) return;
      setResponse(null);
      setError(errorMessage(caught));
    } finally {
      setSending(false);
    }
  }, [input, method, headers, body]);

  const cancel = useCallback(() => {
    if (controllerRef.current) controllerRef.current.abort();
    setSending(false);
    setError('Request cancelled.');
  }, []);

  const hasBody = method !== 'GET' && method !== 'HEAD';

  return (
    <CustomPanel
      title="HTTP request builder"
      description="Sends real requests directly from your browser. CORS is enforced by the browser."
      actions={
        <div className="flex items-center gap-1.5">
          {response ? (
            <>
              <CopyButton value={`STATUS ${response.status} ${response.statusText}\n\n${response.body}`} label="Copy response" size="sm" />
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden /> New request
              </Button>
            </>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="URL">
            <Input
              id="http-url"
              value={input}
              placeholder="https://api.example.com/v1/resource"
              onChange={(event) => setInput(event.target.value)}
            />
          </Field>
          <Field label="Method">
            <Select
              id="http-method"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
              <option value="HEAD">HEAD</option>
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Request headers (Name: value per line)" htmlFor="http-headers">
            <Textarea
              id="http-headers"
              value={headers}
              placeholder="Authorization: Bearer token\nContent-Type: application/json"
              rows={4}
              onChange={(event) => setHeaders(event.target.value)}
            />
            <p className="text-[10px] text-muted">
              Authorization, Cookie and token headers are redacted in the response view.
            </p>
          </Field>
          <Field label="Request body" htmlFor="http-body" help={!hasBody ? 'Bodies are not sent with GET or HEAD.' : undefined}>
            <Textarea
              id="http-body"
              value={body}
              placeholder='{ "key": "value" }'
              rows={6}
              onChange={(event) => setBody(event.target.value)}
              disabled={!hasBody}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="primary" onClick={send} disabled={sending}>
            {sending ? <span className="flex items-center gap-1.5">Sending…</span> : <span className="flex items-center gap-1.5"><Terminal className="h-3.5 w-3.5" aria-hidden /> Send</span>}
          </Button>
          {sending ? (
            <Button type="button" variant="danger" size="sm" onClick={cancel}>
              Cancel
            </Button>
          ) : null}
          <span className="hidden items-center gap-1 text-[11px] text-muted sm:flex">
            <kbd className="rounded border border-line-strong bg-surface px-1.5 py-0.5 font-mono text-[10px] leading-4 text-muted">Ctrl</kbd>
            <kbd className="rounded border border-line-strong bg-surface px-1.5 py-0.5 font-mono text-[10px] leading-4 text-muted">↵</kbd>
            to send
          </span>
        </div>

        {error ? <ToolErrorNote message={error} /> : null}

        {response ? (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            <div className="grid gap-2 sm:grid-cols-4">
              <div className="rounded-card border border-line bg-surface-2/40 px-3 py-2">
                <p className="text-[10px] text-muted">Status</p>
                <p className={cn('font-mono text-sm tabular-nums', response.status >= 400 ? 'text-danger' : 'text-ok')}>
                  {response.status} {response.statusText}
                </p>
              </div>
              <div className="rounded-card border border-line bg-surface-2/40 px-3 py-2">
                <p className="text-[10px] text-muted">Duration</p>
                <p className="font-mono text-sm tabular-nums text-ink-2">{humanMs(response.durationMs)}</p>
              </div>
              <div className="rounded-card border border-line bg-surface-2/40 px-3 py-2">
                <p className="text-[10px] text-muted">Headers</p>
                <p className="font-mono text-sm tabular-nums text-ink-2">{response.headers.length}</p>
              </div>
              <div className="rounded-card border border-line bg-surface-2/40 px-3 py-2">
                <p className="text-[10px] text-muted">Body</p>
                <p className="font-mono text-sm tabular-nums text-ink-2">{response.body.length} chars</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 min-h-0 flex-1">
              <section className="rounded-card border border-line bg-surface flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <p className="text-[11px] font-medium text-ink-2">Response headers</p>
                  {response.headers.length > 0 ? (
                    <CopyButton value={response.headers.map((h) => `${h.name}: ${h.value}`).join('\n')} label="Copy headers" size="sm" />
                  ) : null}
                </div>
                <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed text-ink-2">
                  {response.headers.length === 0 ? (
                    <p className="text-muted">No headers.</p>
                  ) : (
                    response.headers.map((header) => {
                      const redacted = SECRET_HEADER.test(header.name);
                      return (
                        <div key={header.name} className="flex justify-between px-1 py-1 border-b border-line/50 last:border-b-0">
                          <span className="text-ink-2">{header.name}</span>
                          <span className="font-mono">{redacted ? '[redacted]' : header.value}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="rounded-card border border-line bg-surface flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-line px-3 py-2">
                  <p className="text-[11px] font-medium text-ink-2">Response body</p>
                  {response.truncated ? (
                    <span className="text-[10px] text-warn">Truncated at 200 KB</span>
                  ) : null}
                </div>
                <div className="flex-1 overflow-auto p-3 font-mono text-xs leading-relaxed text-ink-2">
                  {response.body || '(empty)'}
                </div>
              </section>
            </div>
          </div>
        ) : error ? null : (
          <EmptyResult
            title="No response yet"
            description="Enter a URL and choose Send. The response appears here, with timing and headers."
          />
        )}
      </div>
    </CustomPanel>
  );
}

/* ------------------------------------------------------------------ */
/* GitHub repository explorer                                         */
/* ------------------------------------------------------------------ */

const GITHUB_RATE_LIMIT_WARNING =
  'Unauthenticated GitHub API requests are limited to 60 per hour per IP. Add a personal access token for higher limits.';

export function GithubUi({ input, setInput, secondary, setSecondary, run, tool }: ToolUiProps) {
  const [token, setToken] = useState(secondary ?? '');
  const [loading, setLoading] = useState(false);
  const [repo, setRepo] = useState<{
    owner: string;
    repo: string;
    description: string | null;
    stars: number;
    forks: number;
    language: string | null;
    license: string | null;
    updatedAt: string;
    openIssues: number;
  } | null>(null);
  const [languages, setLanguages] = useState<Record<string, number> | null>(null);
  const [contents, setContents] = useState<Array<{ name: string; type: string; path: string }> | null>(null);
  const [issues, setIssues] = useState<Array<{ number: number; title: string; state: string; url: string }> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const value = input.trim();
    if (!value) {
      setError('Add a GitHub repository URL.');
      return;
    }
    let ref: { owner: string; repo: string; htmlUrl: string; apiUrl: string };
    try {
      ref = parseRepoUrl(value);
    } catch (caught) {
      setError(errorMessage(caught));
      return;
    }

    setLoading(true);
    setError(null);
    setRepo(null);
    setLanguages(null);
    setContents(null);
    setIssues(null);

    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'DevForge' };
    if (token.trim()) headers.Authorization = `Bearer ${token}`;

    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 20_000);

    try {
      const [repoRes, langRes, contentRes, issueRes] = await Promise.all([
        fetch(`${ref.apiUrl}`, { headers, signal: abort.signal }),
        fetch(`${ref.apiUrl}/languages`, { headers, signal: abort.signal }),
        fetch(`${ref.apiUrl}/contents`, { headers, signal: abort.signal }),
        fetch(`${ref.apiUrl}/issues?state=open&per_page=5`, { headers, signal: abort.signal }),
      ]);

      clearTimeout(timeout);

      if (!repoRes.ok) {
        const detail = repoRes.status === 401 ? 'Unauthorized. Check your token.' : repoRes.status === 403 ? 'Rate limit exceeded. Try again later or add a token.' : `GitHub API returned ${repoRes.status}.`;
        throw new Error(detail);
      }

      const repoData = await repoRes.json();
      const langData = langRes.ok ? (await langRes.json()) : {};
      let contentData: Array<{ name: string; type: string; path: string }> = [];
      if (contentRes.ok) {
        contentData = (await contentRes.json()).filter((item: { type: string }) => item.type === 'file' || item.type === 'dir');
      }
      let issueData: Array<{ number: number; title: string; state: string; url: string }> = [];
      if (issueRes.ok) {
        issueData = (await issueRes.json()).map((item: { number: number; title: string; state: string; html_url: string }) => ({
          number: item.number,
          title: item.title,
          state: item.state,
          url: item.html_url,
        }));
      }

      setRepo({
        owner: ref.owner,
        repo: ref.repo,
        description: repoData.description ?? null,
        stars: repoData.stargazers_count ?? 0,
        forks: repoData.forks_count ?? 0,
        language: repoData.language ?? null,
        license: repoData.license?.spdx_id ?? null,
        updatedAt: repoData.updated_at ?? '',
        openIssues: repoData.open_issues_count ?? 0,
      });
      setLanguages(Object.keys(langData).length > 0 ? langData : null);
      setContents(contentData.length > 0 ? contentData : null);
      setIssues(issueData.length > 0 ? issueData : null);
    } catch (caught) {
      if ((caught as Error).name === 'AbortError') {
        setError('The request timed out.');
      } else {
        setError(errorMessage(caught));
      }
    } finally {
      setLoading(false);
    }
  }, [input, token]);

  const headerList = useMemo(() => {
    const headers: Array<{ name: string; value: string }> = [];
    const parsedHeaders = parseHeaderLines(secondary ?? '');
    // secondary isn't used for token here; we use local `token` state
    return headers;
  }, []);

  return (
    <CustomPanel
      title="GitHub repository explorer"
      description="Reads public repository metadata directly from api.github.com. Nothing is proxied or stored."
      actions={
        <div className="flex items-center gap-1.5">
          {repo ? <CopyButton value={`${repo.owner}/${repo.repo}`} label="Copy repo" size="sm" /> : null}
          <Button type="button" variant="secondary" size="sm" onClick={load} disabled={loading || !input.trim()}>
            {loading ? 'Loading…' : 'Load repository'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="GitHub personal access token (optional)" htmlFor="gh-token">
            <Input
              id="gh-token"
              value={token}
              type="password"
              autoComplete="off"
              placeholder="ghp_…"
              onChange={(event) => setToken(event.target.value)}
            />
            <p className="text-[10px] text-muted">
              Held in memory for this page only. Never persisted or logged.
            </p>
          </Field>
          <Field label="Repository URL or owner/repo" htmlFor="gh-repo">
            <Input
              id="gh-repo"
              value={input}
              placeholder="https://github.com/vercel/next.js"
              onChange={(event) => setInput(event.target.value)}
            />
          </Field>
        </div>

        {!token.trim() ? (
          <div className="rounded-card border border-warn/25 bg-warn/5 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
              <span className="text-xs text-warn">{GITHUB_RATE_LIMIT_WARNING}</span>
            </div>
          </div>
        ) : null}

        {error ? <ToolErrorNote message={error} /> : null}

        {!repo && !error ? (
          <EmptyResult
            title="Load a repository"
            description="Enter a public GitHub URL or owner/repo, then choose Load repository."
          />
        ) : null}

        {repo ? (
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{repo.stars} stars</Badge>
              <Badge>{repo.forks} forks</Badge>
              {repo.language ? <Badge>{repo.language}</Badge> : null}
              {repo.license ? <Badge tone="neutral">{repo.license}</Badge> : null}
              <Badge tone="warn">{repo.openIssues} open issues</Badge>
            </div>

            {repo.description ? (
              <p className="text-xs leading-relaxed text-ink-2">{repo.description}</p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3 min-h-0 flex-1">
              <section className="rounded-card border border-line bg-surface flex flex-col min-h-0">
                <div className="border-b border-line px-3 py-2">
                  <p className="text-[11px] font-medium text-ink-2">Languages</p>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  {languages ? (
                    <ul className="space-y-1.5">
                      {Object.entries(languages)
                        .sort(([, a], [, b]) => b - a)
                        .map(([name, bytes]) => (
                          <li key={name} className="flex justify-between text-[11px]">
                            <span className="text-ink-2">{name}</span>
                            <span className="font-mono text-muted">{((bytes / Object.values(languages).reduce((sum, v) => sum + v, 0)) * 100).toFixed(1)}%</span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-muted">No language data.</p>
                  )}
                </div>
              </section>

              <section className="rounded-card border border-line bg-surface flex flex-col min-h-0">
                <div className="border-b border-line px-3 py-2">
                  <p className="text-[11px] font-medium text-ink-2">Root files &amp; directories</p>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  {contents ? (
                    <ul className="space-y-1">
                      {contents.map((item) => (
                        <li key={item.path} className="flex items-center gap-1.5 text-[11px]">
                          <span className="h-2.5 w-2.5 rounded border border-line-strong flex-shrink-0" aria-hidden />
                          <span className="font-mono text-ink-2">{item.name}</span>
                          <span className="ml-auto text-[10px] text-muted">{item.type}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-muted">No contents.</p>
                  )}
                </div>
              </section>

              <section className="rounded-card border border-line bg-surface flex flex-col min-h-0">
                <div className="border-b border-line px-3 py-2">
                  <p className="text-[11px] font-medium text-ink-2">Open issues</p>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  {issues ? (
                    <ul className="space-y-1.5">
                      {issues.map((issue) => (
                        <li key={issue.number} className="text-[11px]">
                          <span className="font-mono text-muted">#{issue.number}</span>{' '}
                          <span className="text-ink-2">{issue.title}</span>
                          <span className={`ml-1 text-[10px] rounded border px-1.5 ${issue.state === 'open' ? 'border-ok/25 bg-ok/10 text-ok' : 'border-muted/25 bg-muted/5 text-muted'}`}>{issue.state}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-[10px] text-muted">No issues.</p>
                  )}
                </div>
              </section>
            </div>

            <p className="text-[10px] text-muted">
              Updated {new Date(repo.updatedAt).toLocaleString()} ·{' '}
              <a href={`https://github.com/${repo.owner}/${repo.repo}`} target="_blank" rel="noopener noreferrer" className="text-accent underline underline-offset-4">
                Open on GitHub
              </a>
            </p>
          </div>
        ) : null}
      </div>
    </CustomPanel>
  );
}
