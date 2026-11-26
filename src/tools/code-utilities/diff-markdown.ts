import { diffLines, diffWordsWithSpace } from 'diff';
import {
  assertInput,
  optionBoolean,
  optionString,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

export const textDiff: ToolDefinition = {
  id: 'text-diff',
  name: 'Text diff',
  summary: 'Compare two blocks of text by line or word and read a unified +/- report.',
  category: 'code',
  version: '1.0.0',
  tags: ['diff', 'compare', 'text', 'review'],
  aliases: ['compare text', 'text compare', 'diff checker'],
  privacy: { locality: 'local', note: 'Both texts stay in your browser.' },
  ui: 'compare',
  input: {
    label: 'Original text',
    sample: `The forge opens at nine.
Every tool runs locally.
No account is required.`,
    rows: 10,
    secondary: {
      label: 'Changed text',
      sample: `The forge opens at eight.
Every tool runs locally by default.
No account is required.
Sign in only for cloud sync.`,
    },
  },
  options: [
    {
      kind: 'select',
      id: 'mode',
      label: 'Granularity',
      defaultValue: 'lines',
      choices: [
        { value: 'lines', label: 'Lines' },
        { value: 'words', label: 'Words' },
      ],
    },
    { kind: 'toggle', id: 'ignoreCase', label: 'Ignore case', defaultValue: false },
  ],
  run(input, options, secondary): ToolResult {
    const left = assertInput(input, 'Original text');
    const right = assertInput(secondary ?? '', 'Changed text');
    const ignoreCase = optionBoolean(options, 'ignoreCase');
    const a = ignoreCase ? left.toLowerCase() : left;
    const b = ignoreCase ? right.toLowerCase() : right;
    const mode = optionString(options, 'mode', 'lines');
    const parts =
      mode === 'words'
        ? diffWordsWithSpace(a, b)
        : diffLines(a, b, { newlineIsToken: false });

    const lines: string[] = [];
    let added = 0;
    let removed = 0;
    for (const part of parts) {
      const prefix = part.added ? '+' : part.removed ? '-' : ' ';
      if (part.added) added += part.value.split('\n').filter(Boolean).length;
      if (part.removed) removed += part.value.split('\n').filter(Boolean).length;
      const content = mode === 'lines' ? part.value.replace(/\n$/, '') : part.value;
      for (const line of content.split('\n')) {
        lines.push(`${prefix} ${line}`);
      }
    }
    const identical = added === 0 && removed === 0;
    return {
      output: identical ? 'No differences.' : lines.join('\n'),
      meta: [
        { label: 'Added', value: String(added) },
        { label: 'Removed', value: String(removed) },
        { label: 'Granularity', value: mode },
      ],
      warnings: ignoreCase ? ['Case differences are ignored.'] : undefined,
    };
  },
  docs: {
    about:
      'Uses the jsdiff line and word diff algorithms. Output uses unified-diff prefixes: + added, - removed, space unchanged.',
    limitations: [
      'This is a two-way comparison, not a three-way merge.',
      'Very large inputs produce long reports; the browser may take a moment.',
    ],
  },
};

export const markdownPreviewer: ToolDefinition = {
  id: 'markdown-preview',
  name: 'Markdown preview',
  summary: 'Write GitHub-flavored Markdown and preview the sanitized HTML beside it.',
  category: 'code',
  version: '1.0.0',
  tags: ['markdown', 'preview', 'html', 'readme'],
  aliases: ['md preview', 'markdown editor'],
  privacy: { locality: 'local', note: 'Rendered and sanitized in your browser.' },
  ui: 'markdown',
  input: {
    label: 'Markdown source',
    sample: `# DevForge

One platform. Every developer tool.

## What works

- **40+ local utilities** with no account
- Optional AI with your own key
- A validated plugin manifest format

> Deterministic tools never call a model.

\`\`\`ts
const forge = createForge({ local: true });
\`\`\`

| Area | Runs locally |
| --- | --- |
| JSON | yes |
| HTTP client | browser network |

[Read the docs](/docs)
`,
    rows: 18,
  },
  run(input): ToolResult {
    const source = assertInput(input, 'Markdown');
    const headings = [...source.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({
      level: match[1].length,
      text: match[2].trim(),
    }));
    const words = source.trim().split(/\s+/).filter(Boolean).length;
    const output = [
      `Headings: ${headings.length}`,
      ...headings.map((heading) => `${'  '.repeat(heading.level - 1)}${heading.text}`),
      '',
      `Words: ${words}`,
      `Code fences: ${(source.match(/^```/gm) ?? []).length / 2}`,
    ].join('\n');
    return {
      output,
      meta: [
        { label: 'Words', value: String(words) },
        { label: 'Headings', value: String(headings.length) },
      ],
    };
  },
  docs: {
    about:
      'The preview uses marked for GitHub-flavored Markdown and DOMPurify before injecting HTML. Raw HTML is sanitized, not trusted.',
    limitations: [
      'Sanitization removes scripts and event handlers, so interactive HTML does not run in the preview.',
      'Preview styling is a close approximation of GitHub Markdown, not an exact match.',
    ],
  },
};
