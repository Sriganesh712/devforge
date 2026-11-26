'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Code2, Eye, RotateCw } from 'lucide-react';
import type { ToolUiProps } from './types';
import { CodeBlock, CustomPanel, EmptyResult, ToolErrorNote } from './shared';
import { Badge } from '@/packages/ui/surface';
import { Button } from '@/packages/ui/button';
import { CopyButton } from '@/packages/ui/copy-button';
import { runRegex } from '@/tools/code-utilities/regex';
import { parseSqlSchema } from '@/tools/database-tools/schema';
import { layoutGraph, parseGitLog } from '@/tools/git-tools/graph';
import { truncate } from '@/lib/utils';

export function CompareUi({ result, error, running, run, tool }: ToolUiProps) {
  const lines = result?.output.split('\n') ?? [];
  return (
    <CustomPanel
      title="Difference"
      description="Added, removed and changed lines from the last run."
      actions={
        <div className="flex items-center gap-1.5">
          {result ? <CopyButton value={result.output} label="Copy diff" size="sm" /> : null}
          <Button type="button" variant="secondary" size="sm" onClick={run} disabled={running}>
            <RotateCw className="h-3.5 w-3.5" aria-hidden />
            {running ? 'Comparing…' : 'Compare'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? <ToolErrorNote message={error} /> : null}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <Badge tone="ok">+ added</Badge>
          <Badge tone="danger">− removed</Badge>
          <Badge tone="warn">~ changed</Badge>
          <span className="ml-auto font-mono">{lines.length} lines</span>
        </div>
        {result ? (
          <div className="df-scroll max-h-[560px] overflow-auto rounded-card border border-line bg-surface-2/50 p-2 font-mono text-xs leading-relaxed">
            {lines.map((line, index) => {
              const tone = line.startsWith('+')
                ? 'bg-ok/10 text-ok'
                : line.startsWith('-')
                  ? 'bg-danger/10 text-danger'
                  : line.startsWith('~')
                    ? 'bg-warn/10 text-warn'
                    : 'text-ink-2';
              return (
                <div key={`${index}-${line.slice(0, 16)}`} className={`whitespace-pre-wrap break-words rounded px-1.5 py-0.5 ${tone}`}>
                  {line || ' '}
                </div>
              );
            })}
          </div>
        ) : error ? null : (
          <EmptyResult
            title={tool.ui === 'compare' ? 'Compare two inputs' : 'Nothing to compare'}
            description="Edit both inputs, then choose Compare. The diff stays in your browser."
          />
        )}
      </div>
    </CustomPanel>
  );
}

function HighlightedText({ text, matches }: { text: string; matches: ReturnType<typeof runRegex>['matches'] }) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const [index, match] of matches.entries()) {
    if (match.index < last) continue;
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match.value.length > 0) {
      parts.push(
        <mark key={`${index}-${match.index}`} className="rounded bg-accent-soft px-0.5 text-ink">
          {match.value}
        </mark>,
      );
    }
    last = match.index + match.value.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function RegexUi({ input, options }: ToolUiProps) {
  const pattern = String(options.pattern ?? '');
  const flags = String(options.flags ?? '');
  const analysis = useMemo(() => {
    try {
      return { run: runRegex(pattern, flags, input), error: null };
    } catch (caught) {
      return {
        run: null,
        error: caught instanceof Error ? caught.message : 'The pattern could not be compiled.',
      };
    }
  }, [pattern, flags, input]);

  return (
    <CustomPanel
      title="Matches"
      description="The same native RegExp drives the highlight and the match list."
      actions={
        analysis.run && analysis.run.matches.length > 0 ? (
          <Badge tone="accent">{analysis.run.matches.length} matches</Badge>
        ) : null
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-surface-2/50 px-3 py-2">
          <Code2 className="h-3.5 w-3.5 text-muted" aria-hidden />
          <code className="break-all font-mono text-xs text-ink">
            /{pattern || '(empty)'}/{flags}
          </code>
        </div>
        {analysis.error ? <ToolErrorNote message={analysis.error} /> : null}
        {analysis.run ? (
          <>
            <div className="df-scroll max-h-[260px] overflow-auto whitespace-pre-wrap break-words rounded-card border border-line bg-surface-2/40 p-3 font-mono text-xs leading-relaxed text-ink-2">
              <HighlightedText text={input} matches={analysis.run.matches} />
            </div>
            {analysis.run.matches.length === 0 ? (
              <EmptyResult title="No matches" description="The pattern is valid but does not match this text." />
            ) : (
              <div className="df-scroll max-h-[300px] overflow-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-surface text-[10px] text-muted">
                    <tr>
                      <th className="border-b border-line px-2 py-1.5 font-medium">#</th>
                      <th className="border-b border-line px-2 py-1.5 font-medium">At</th>
                      <th className="border-b border-line px-2 py-1.5 font-medium">Match</th>
                      <th className="border-b border-line px-2 py-1.5 font-medium">Groups</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.run.matches.slice(0, 100).map((match, index) => (
                      <tr key={`${index}-${match.index}`} className="align-top">
                        <td className="border-b border-line px-2 py-1.5 font-mono text-muted">{index + 1}</td>
                        <td className="border-b border-line px-2 py-1.5 font-mono text-muted">{match.index}</td>
                        <td className="border-b border-line px-2 py-1.5 font-mono text-ink">{match.value || '∅'}</td>
                        <td className="border-b border-line px-2 py-1.5 font-mono text-ink-2">
                          {match.groups.length > 0 ? match.groups.map((group) => group ?? '∅').join(' · ') : '—'}
                          {Object.keys(match.named).length > 0
                            ? ` (${Object.entries(match.named)
                                .map(([key, value]) => `${key}=${value ?? '∅'}`)
                                .join(', ')})`
                            : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {analysis.run.matches.length > 100 ? (
                  <p className="mt-2 text-[11px] text-muted">
                    Showing the first 100 of {analysis.run.matches.length} matches.
                  </p>
                ) : null}
              </div>
            )}
            {analysis.run.truncated ? (
              <p className="text-[11px] text-warn">The match list was truncated at 500 results.</p>
            ) : null}
          </>
        ) : null}
      </div>
    </CustomPanel>
  );
}

export function MarkdownUi({ input }: ToolUiProps) {
  const [tab, setTab] = useState<'preview' | 'html'>('preview');
  const [html, setHtml] = useState('');
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = marked.parse(input, { gfm: true, breaks: false, async: false }) as string;
      setHtml(DOMPurify.sanitize(raw));
      setRenderError(null);
    } catch (caught) {
      setHtml('');
      setRenderError(caught instanceof Error ? caught.message : 'Could not render this Markdown.');
    }
  }, [input]);

  const stats = useMemo(() => {
    const words = input.trim().split(/\s+/).filter(Boolean).length;
    const headings = (input.match(/^#{1,6}\s+/gm) ?? []).length;
    const links = (input.match(/\[[^\]]+\]\([^)]+\)/g) ?? []).length;
    return { words, headings, links };
  }, [input]);

  return (
    <CustomPanel
      title="Preview"
      description="Sanitized with DOMPurify before it is rendered."
      actions={
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant={tab === 'preview' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTab('preview')}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Preview
          </Button>
          <Button
            type="button"
            variant={tab === 'html' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setTab('html')}
          >
            <Code2 className="h-3.5 w-3.5" aria-hidden />
            HTML
          </Button>
          <CopyButton value={html} label="Copy HTML" size="sm" variant="ghost" />
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge>{stats.words} words</Badge>
          <Badge>{stats.headings} headings</Badge>
          <Badge>{stats.links} links</Badge>
        </div>
        {renderError ? <ToolErrorNote message={renderError} /> : null}
        {tab === 'preview' ? (
          <div className="df-scroll max-h-[620px] overflow-auto rounded-card border border-line bg-surface px-5 py-4">
            {html ? (
              <article className="df-prose" dangerouslySetInnerHTML={{ __html: html }} />
            ) : (
              <p className="text-sm text-muted">Rendering the preview…</p>
            )}
          </div>
        ) : (
          <CodeBlock value={html} label="Copy HTML" language="html" />
        )}
      </div>
    </CustomPanel>
  );
}

export function HtmlUi({ input }: ToolUiProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const stats = useMemo(() => {
    const tags = input.match(/<[a-z][^>]*>/gi)?.length ?? 0;
    const scripts = input.match(/<script\b/gi)?.length ?? 0;
    const handlers = input.match(/\son[a-z]+\s*=/gi)?.length ?? 0;
    return { tags, scripts, handlers };
  }, [input]);

  return (
    <CustomPanel
      title="Sandboxed preview"
      description="Scripts run inside an iframe without same-origin access to DevForge."
      actions={
        <Button type="button" variant="secondary" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
          <RotateCw className="h-3.5 w-3.5" aria-hidden />
          Reload
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge>{stats.tags} tags</Badge>
          <Badge tone={stats.scripts > 0 ? 'warn' : 'neutral'}>{stats.scripts} scripts</Badge>
          <Badge tone={stats.handlers > 0 ? 'warn' : 'neutral'}>{stats.handlers} inline handlers</Badge>
        </div>
        <iframe
          key={reloadKey}
          title="HTML preview"
          sandbox="allow-scripts"
          srcDoc={input}
          className="h-[520px] w-full rounded-card border border-line bg-white"
        />
        <p className="text-[11px] leading-relaxed text-muted">
          The iframe has <code className="font-mono">sandbox=&quot;allow-scripts&quot;</code> and no same-origin
          permission. It cannot read this page, local storage or your AI key.
        </p>
      </div>
    </CustomPanel>
  );
}

export function SchemaUi({ input }: ToolUiProps) {
  const parsed = useMemo(() => {
    try {
      return { schema: parseSqlSchema(input), error: null };
    } catch (caught) {
      return {
        schema: null,
        error: caught instanceof Error ? caught.message : 'Could not parse this DDL.',
      };
    }
  }, [input]);

  return (
    <CustomPanel
      title="Schema"
      description="Tables and foreign keys parsed from CREATE TABLE statements."
      actions={
        parsed.schema ? (
          <Badge tone="accent">
            {parsed.schema.tables.length} tables · {parsed.schema.relations.length} relations
          </Badge>
        ) : null
      }
    >
      <div className="flex flex-col gap-3">
        {parsed.error ? <ToolErrorNote message={parsed.error} /> : null}
        {parsed.schema ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {parsed.schema.tables.map((table) => (
                <div key={table.name} className="overflow-hidden rounded-card border border-line bg-surface">
                  <div className="flex items-center justify-between border-b border-line bg-surface-2/50 px-3 py-2">
                    <span className="font-mono text-xs font-medium text-ink">{table.name}</span>
                    <span className="text-[10px] text-muted">{table.columns.length} columns</span>
                  </div>
                  <ul className="divide-y divide-line">
                    {table.columns.map((column) => (
                      <li key={column.name} className="flex items-start gap-2 px-3 py-1.5 text-[11px]">
                        <span className="min-w-0 flex-1">
                          <span className="font-mono text-ink">{column.name}</span>
                          <span className="ml-1.5 font-mono text-muted">{column.type}</span>
                        </span>
                        <span className="flex shrink-0 gap-1">
                          {column.primaryKey ? <Badge tone="accent">PK</Badge> : null}
                          {column.references ? <Badge tone="warn">FK</Badge> : null}
                          {column.nullable ? null : <span className="font-mono text-[10px] text-muted">NN</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-medium text-muted">Relationships</p>
              {parsed.schema.relations.length > 0 ? (
                <ul className="space-y-1 rounded-card border border-line bg-surface-2/40 px-3 py-2 font-mono text-[11px] text-ink-2">
                  {parsed.schema.relations.map((relation, index) => (
                    <li key={`${relation.fromTable}-${relation.fromColumn}-${index}`}>
                      {relation.fromTable}.{relation.fromColumn} → {relation.toTable}
                      {relation.toColumn ? `.${relation.toColumn}` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted">No foreign keys found.</p>
              )}
            </div>
            {parsed.schema.warnings.length > 0 ? (
              <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-warn">
                {parsed.schema.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </CustomPanel>
  );
}

export function GitGraphUi({ input }: ToolUiProps) {
  const parsed = useMemo(() => {
    try {
      return { layout: layoutGraph(parseGitLog(input)), error: null };
    } catch (caught) {
      return {
        layout: null,
        error: caught instanceof Error ? caught.message : 'Could not parse this log.',
      };
    }
  }, [input]);

  const graph = parsed.layout;
  const rowHeight = 34;
  const laneWidth = 24;
  const left = 20;
  const top = 24;
  const textX = left + (graph?.lanes ?? 1) * laneWidth + 14;
  const shaWidth = 58;
  const subjectX = textX + shaWidth;
  const maxSubject = graph
    ? Math.min(72, Math.max(...graph.nodes.map((node) => node.subject.length), 20))
    : 40;
  const width = Math.max(560, subjectX + maxSubject * 6.4 + 24);
  const height = graph ? Math.max(120, top * 2 + graph.nodes.length * rowHeight) : 160;

  return (
    <CustomPanel
      title="Commit graph"
      description="Lanes come from parent relationships in the pasted log."
      actions={
        graph ? (
          <div className="flex items-center gap-1.5">
            <Badge tone="accent">{graph.nodes.length} commits</Badge>
            <Badge>{graph.lanes} lanes</Badge>
          </div>
        ) : null
      }
    >
      <div className="flex flex-col gap-3">
        {parsed.error ? <ToolErrorNote message={parsed.error} /> : null}
        {graph ? (
          <>
            <div className="df-scroll max-h-[560px] overflow-auto rounded-card border border-line bg-surface">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                width={width}
                height={height}
                role="img"
                aria-label={`Git graph with ${graph.nodes.length} commits in ${graph.lanes} lanes`}
                className="block max-w-none"
              >
                {graph.edges.map((edge) => {
                  const x1 = left + edge.fromLane * laneWidth;
                  const y1 = top + edge.fromRow * rowHeight;
                  const x2 = left + edge.toLane * laneWidth;
                  const y2 = top + edge.toRow * rowHeight;
                  return (
                    <path
                      key={`${edge.from}-${edge.to}`}
                      d={`M ${x1} ${y1} C ${x1} ${y1 + rowHeight / 2}, ${x2} ${y2 - rowHeight / 2}, ${x2} ${y2}`}
                      fill="none"
                      stroke="var(--df-line-strong)"
                      strokeWidth="1.5"
                    />
                  );
                })}
                {graph.nodes.map((node) => {
                  const x = left + node.lane * laneWidth;
                  const y = top + node.row * rowHeight;
                  return (
                    <g key={node.sha}>
                      <title>
                        {node.sha} {node.subject}
                      </title>
                      <circle
                        cx={x}
                        cy={y}
                        r={node.head ? 5 : 4}
                        fill={node.head ? 'var(--df-accent)' : 'var(--df-surface)'}
                        stroke={node.head ? 'var(--df-accent)' : 'var(--df-ink-2)'}
                        strokeWidth="1.5"
                      />
                      <text
                        x={textX}
                        y={y + 3.5}
                        fontFamily="var(--font-mono)"
                        fontSize="10"
                        fill={node.head ? 'var(--df-accent)' : 'var(--df-muted)'}
                      >
                        {node.sha.slice(0, 7)}
                      </text>
                      <text x={subjectX} y={y + 3.5} fontSize="12" fill="var(--df-ink)">
                        {truncate(node.subject, 72)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" aria-hidden />
                HEAD
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full border border-ink-2 bg-surface" aria-hidden />
                commit
              </span>
              {graph.missingParents.length > 0 ? (
                <span className="text-warn">
                  {graph.missingParents.length} parent(s) outside this log
                </span>
              ) : null}
            </div>
            {graph.missingParents.length > 0 ? (
              <p className="text-[11px] leading-relaxed text-warn">
                Parents outside this log: {graph.missingParents.join(', ')}. Fetch more history for complete
                edges.
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </CustomPanel>
  );
}
