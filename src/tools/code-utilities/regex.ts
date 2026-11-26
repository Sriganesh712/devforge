import {
  assertInput,
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

export const REGEX_FLAGS = ['g', 'i', 'm', 's', 'u', 'y'] as const;

export interface RegexMatch {
  value: string;
  index: number;
  groups: string[];
  named: Record<string, string | undefined>;
}

export interface RegexRun {
  matches: RegexMatch[];
  truncated: boolean;
}

export function runRegex(pattern: string, flags: string, text: string, limit = 500): RegexRun {
  if (!pattern) throw new ToolError('Add a regular expression pattern.');
  const unique = [...new Set(flags.split(''))].filter((flag) =>
    (REGEX_FLAGS as readonly string[]).includes(flag),
  );
  if (unique.includes('u') && unique.includes('v')) {
    throw new ToolError('Flags u and v cannot be used together.');
  }
  let regex: RegExp;
  try {
    regex = new RegExp(pattern, unique.join(''));
  } catch (error) {
    throw new ToolError(
      `Invalid regular expression: ${error instanceof Error ? error.message : 'unknown error'}`,
    );
  }
  const global = unique.includes('g');
  const matches: RegexMatch[] = [];
  let truncated = false;

  if (!global) {
    const match = regex.exec(text);
    if (match) {
      matches.push({
        value: match[0],
        index: match.index,
        groups: match.slice(1),
        named: match.groups ?? {},
      });
    }
    return { matches, truncated };
  }

  let guard = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    matches.push({
      value: match[0],
      index: match.index,
      groups: match.slice(1),
      named: match.groups ?? {},
    });
    guard += 1;
    if (match[0] === '') regex.lastIndex += 1;
    if (guard >= limit) {
      truncated = true;
      break;
    }
    if (regex.lastIndex > text.length) break;
  }
  return { matches, truncated };
}

export const regexTester: ToolDefinition = {
  id: 'regex-tester',
  name: 'Regex tester',
  summary: 'Test a JavaScript regular expression with flags, highlighted matches and groups.',
  category: 'code',
  version: '1.0.0',
  tags: ['regex', 'regexp', 'pattern', 'test'],
  aliases: ['regexp tester', 'regular expression'],
  privacy: { locality: 'local', note: 'The pattern runs in your browser tab.' },
  ui: 'regex',
  featured: true,
  input: {
    label: 'Test text',
    sample: `Order #1042 shipped 2026-11-02.
Order #1043 shipped 2026-11-05.
Order #1050 is pending.`,
    rows: 10,
  },
  options: [
    { kind: 'text', id: 'pattern', label: 'Pattern', defaultValue: 'Order #(\\d+) shipped (\\d{4}-\\d{2}-\\d{2})' },
    {
      kind: 'select',
      id: 'flags',
      label: 'Flags',
      defaultValue: 'g',
      choices: [
        { value: 'g', label: 'g — global' },
        { value: 'gi', label: 'gi — global + ignore case' },
        { value: 'gm', label: 'gm — global + multiline' },
        { value: 'gim', label: 'gim — global + ignore case + multiline' },
        { value: 'gs', label: 'gs — global + dotall' },
        { value: '', label: 'No flags' },
      ],
    },
  ],
  run(input, options): ToolResult {
    const source = assertInput(input, 'Test text');
    const pattern = optionString(options, 'pattern');
    const flags = optionString(options, 'flags', 'g');
    const { matches, truncated } = runRegex(pattern, flags, source);
    if (matches.length === 0) {
      return { output: 'No matches.', meta: [{ label: 'Matches', value: '0' }] };
    }
    const lines = matches.map((match, index) => {
      const groups =
        match.groups.length > 0
          ? ` groups: ${match.groups.map((group) => JSON.stringify(group)).join(', ')}`
          : '';
      const named = Object.entries(match.named).filter(([, value]) => value !== undefined);
      const namedText =
        named.length > 0 ? ` named: ${named.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(', ')}` : '';
      return `${index + 1}. [${match.index}] ${JSON.stringify(match.value)}${groups}${namedText}`;
    });
    return {
      output: lines.join('\n'),
      meta: [{ label: 'Matches', value: String(matches.length) }],
      warnings: truncated ? ['Match list truncated at 500 results.'] : undefined,
    };
  },
  docs: {
    about:
      'Builds a native JavaScript RegExp. Highlighting is derived from the same match list, so the preview and report cannot disagree.',
    limitations: [
      'Patterns are not sandboxed from the tab. Catastrophic backtracking can freeze the page; keep patterns bounded.',
      'Lookbehind support depends on the browser.',
    ],
  },
};
