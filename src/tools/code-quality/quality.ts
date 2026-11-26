import {
  assertInput,
  optionNumber,
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

export interface ComplexityReport {
  lines: number;
  codeLines: number;
  decisions: number;
  complexity: number;
  functions: number;
  maxDepth: number;
  counts: Record<string, number>;
}

/** Strips comments and string literals so keywords inside them are not counted. */
export function stripNoise(source: string): string {
  let output = '';
  let state: 'code' | 'line' | 'block' | 'single' | 'double' | 'template' = 'code';
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (state === 'code') {
      if (char === '/' && next === '/') {
        state = 'line';
        index += 1;
      } else if (char === '/' && next === '*') {
        state = 'block';
        index += 1;
      } else if (char === "'") {
        state = 'single';
      } else if (char === '"') {
        state = 'double';
      } else if (char === '`') {
        state = 'template';
      } else {
        output += char;
      }
    } else if (state === 'line') {
      if (char === '\n') {
        state = 'code';
        output += '\n';
      }
    } else if (state === 'block') {
      if (char === '*' && next === '/') {
        state = 'code';
        index += 1;
      } else if (char === '\n') {
        output += '\n';
      }
    } else {
      if (char === '\\') {
        index += 1;
      } else if (
        (state === 'single' && char === "'") ||
        (state === 'double' && char === '"') ||
        (state === 'template' && char === '`')
      ) {
        state = 'code';
      } else if (char === '\n' && state !== 'template') {
        state = 'code';
        output += '\n';
      }
    }
  }
  return output;
}

export function analyzeComplexity(source: string): ComplexityReport {
  const cleaned = stripNoise(source);
  const lines = source.split(/\r?\n/);
  const codeLines = cleaned.split(/\r?\n/).filter((line) => line.trim()).length;
  const patterns: Array<[string, RegExp]> = [
    ['if', /\bif\s*\(/g],
    ['else if', /\belse\s+if\s*\(/g],
    ['for', /\bfor\s*\(/g],
    ['while', /\bwhile\s*\(/g],
    ['case', /\bcase\s+[^:]+:/g],
    ['catch', /\bcatch\s*\(/g],
    ['and', /&&/g],
    ['or', /\|\|/g],
    ['nullish', /\?\?/g],
    ['ternary', /(?<![?.])\?(?![.?])/g],
  ];
  const counts: Record<string, number> = {};
  let decisions = 0;
  for (const [name, pattern] of patterns) {
    const found = cleaned.match(pattern)?.length ?? 0;
    counts[name] = found;
    decisions += found;
  }
  // else-if is already counted by if; do not double count it.
  decisions -= counts['else if'] ?? 0;
  const functions =
    (cleaned.match(/\bfunction\b/g)?.length ?? 0) +
    (cleaned.match(/=>/g)?.length ?? 0) +
    (cleaned.match(/\b(?:public|private|protected)\s+(?:static\s+)?[\w<>[\]]+\s+\w+\s*\(/g)?.length ?? 0);
  let depth = 0;
  let maxDepth = 0;
  for (const char of cleaned) {
    if (char === '{') {
      depth += 1;
      maxDepth = Math.max(maxDepth, depth);
    } else if (char === '}') {
      depth = Math.max(0, depth - 1);
    }
  }
  return {
    lines: lines.length,
    codeLines,
    decisions,
    complexity: decisions + 1,
    functions,
    maxDepth,
    counts,
  };
}

export const complexityAnalyzer: ToolDefinition = {
  id: 'complexity-analyzer',
  name: 'Complexity analyzer',
  summary: 'Estimate cyclomatic complexity, nesting and decision counts for C-like source files.',
  category: 'quality',
  version: '1.0.0',
  tags: ['complexity', 'metrics', 'quality', 'refactor'],
  aliases: ['cyclomatic complexity', 'code metrics'],
  privacy: { locality: 'local', note: 'Source stays in your browser.' },
  input: {
    label: 'Source code',
    sample: `function priceFor(user, items, coupon) {
  if (!user.active) {
    return 0;
  }
  let total = 0;
  for (const item of items) {
    if (item.quantity > 0 && item.price > 0) {
      total += item.quantity * item.price;
    }
  }
  if (coupon && coupon.percent) {
    total = total * (1 - coupon.percent / 100);
  }
  return total > 0 ? total : 0;
}`,
    rows: 16,
  },
  options: [
    {
      kind: 'select',
      id: 'language',
      label: 'Language family',
      defaultValue: 'js',
      choices: [
        { value: 'js', label: 'JavaScript / TypeScript' },
        { value: 'java', label: 'Java / C# / Kotlin' },
        { value: 'go', label: 'Go / Rust / C' },
      ],
    },
  ],
  run(input, options): ToolResult {
    const source = assertInput(input);
    const report = analyzeComplexity(source);
    const rating =
      report.complexity <= 10 ? 'low' : report.complexity <= 20 ? 'moderate' : 'high';
    const contributors = Object.entries(report.counts)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => `  ${name}: ${count}`);
    const output = [
      `Estimated cyclomatic complexity: ${report.complexity} (${rating})`,
      `Decision points: ${report.decisions}`,
      `Functions / arrow functions: ${report.functions}`,
      `Max brace depth: ${report.maxDepth}`,
      `Lines: ${report.lines} (${report.codeLines} non-empty)`,
      '',
      'Decision contributors',
      ...(contributors.length > 0 ? contributors : ['  none']),
      '',
      'This is a token-based estimate, not a compiler AST. Use it to find files worth reviewing, not as a gate.',
    ].join('\n');
    const warnings: string[] = [];
    if (report.complexity > 20) warnings.push('High estimated complexity. Consider splitting the function or file.');
    if (report.maxDepth > 4) warnings.push('Deep nesting detected. Early returns usually flatten this.');
    return {
      output,
      meta: [
        { label: 'Complexity', value: String(report.complexity) },
        { label: 'Rating', value: rating },
      ],
      warnings,
      language: optionString(options, 'language', 'js'),
    };
  },
  docs: {
    about:
      'Counts branch keywords and operators after removing comments and string literals. Complexity = decision points + 1.',
    limitations: [
      'It is a heuristic, not a language-aware AST analysis. Regex literals, macros and template expressions can skew counts.',
      'It reports per input block, not per function.',
      'Supported families are C-like syntaxes; Python and Ruby are not handled well.',
    ],
  },
};

interface DuplicateBlock {
  length: number;
  first: { start: number; lines: number[] };
  second: { start: number; lines: number[] };
  preview: string;
}

export function findDuplicates(
  source: string,
  minLines = 4,
  limit = 20,
): { blocks: DuplicateBlock[]; duplicatedLines: number } {
  const raw = source.split(/\r?\n/);
  const normalized: Array<{ text: string; line: number }> = [];
  for (const [index, line] of raw.entries()) {
    const text = line.trim().replace(/\s+/g, ' ');
    if (!text || text.startsWith('//') || text.startsWith('#')) continue;
    normalized.push({ text, line: index + 1 });
  }
  const blocks: DuplicateBlock[] = [];
  const seen = new Set<string>();
  const covered = new Set<number>();
  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = i + minLines; j < normalized.length; j += 1) {
      if (normalized[i].text !== normalized[j].text) continue;
      let length = 0;
      while (
        j + length < normalized.length &&
        normalized[i + length]?.text === normalized[j + length]?.text
      ) {
        length += 1;
      }
      if (length < minLines) continue;
      const key = `${i}:${j}:${length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      blocks.push({
        length,
        first: { start: normalized[i].line, lines: normalized.slice(i, i + length).map((entry) => entry.line) },
        second: { start: normalized[j].line, lines: normalized.slice(j, j + length).map((entry) => entry.line) },
        preview: normalized[i].text,
      });
      for (const entry of normalized.slice(i, i + length)) covered.add(entry.line);
      for (const entry of normalized.slice(j, j + length)) covered.add(entry.line);
      j += length - 1;
    }
  }
  blocks.sort((a, b) => b.length - a.length);
  return { blocks: blocks.slice(0, limit), duplicatedLines: covered.size };
}

export const duplicateDetector: ToolDefinition = {
  id: 'duplicate-code-detector',
  name: 'Duplicate code detector',
  summary: 'Find repeated blocks of normalized lines and review them before refactoring.',
  category: 'quality',
  version: '1.0.0',
  tags: ['duplicates', 'quality', 'refactor', 'dry'],
  aliases: ['copy paste detector', 'duplicate lines'],
  privacy: { locality: 'local', note: 'Source stays in your browser.' },
  input: {
    label: 'Source code',
    sample: `function renderUserCard(user) {
  const name = user.name.trim();
  const role = user.role.toUpperCase();
  const joined = formatDate(user.joinedAt);
  return renderCard(name, role, joined);
}

function renderAdminCard(admin) {
  const name = admin.name.trim();
  const role = admin.role.toUpperCase();
  const joined = formatDate(admin.joinedAt);
  return renderCard(name, role, joined);
}`,
    rows: 16,
  },
  options: [
    { kind: 'number', id: 'minLines', label: 'Minimum block size', defaultValue: 4, min: 3, max: 20 },
  ],
  run(input, options): ToolResult {
    const source = assertInput(input);
    const minLines = Math.round(optionNumber(options, 'minLines', 4));
    if (source.split(/\r?\n/).length > 5000) {
      throw new ToolError('Limit input to 5000 lines so the detector stays responsive.');
    }
    const { blocks, duplicatedLines } = findDuplicates(source, minLines);
    if (blocks.length === 0) {
      return {
        output: `No duplicate blocks of ${minLines}+ non-empty lines found.`,
        meta: [{ label: 'Blocks', value: '0' }],
      };
    }
    const output = [
      `Found ${blocks.length} duplicate block${blocks.length === 1 ? '' : 's'} (${duplicatedLines} lines involved).`,
      '',
      ...blocks.map(
        (block, index) =>
          `${index + 1}. ${block.length} lines: ${block.first.start}-${block.first.start + block.length - 1} and ${block.second.start}-${block.second.start + block.length - 1}\n   ${block.preview}`,
      ),
      '',
      'Review before extracting a helper: identical lines are not always the same concept.',
    ].join('\n');
    return {
      output,
      meta: [
        { label: 'Blocks', value: String(blocks.length) },
        { label: 'Lines involved', value: String(duplicatedLines) },
      ],
    };
  },
  docs: {
    about:
      'Normalizes whitespace, skips blank and comment-only lines, then compares repeated sequences of lines.',
    limitations: [
      'A prototype, not semantic clone detection: renamed variables are not matched.',
      'Overlapping blocks can be reported separately; the input is capped at 5000 lines.',
      'It does not judge whether the duplication is worth removing.',
    ],
  },
};

export const packageAnalyzer: ToolDefinition = {
  id: 'package-json-analyzer',
  name: 'package.json analyzer',
  summary: 'Inspect dependency ranges, scripts, duplicates and packaging metadata.',
  category: 'quality',
  version: '1.0.0',
  tags: ['npm', 'package.json', 'dependencies', 'quality'],
  aliases: ['dependency inspector', 'npm package check'],
  privacy: { locality: 'local', note: 'The manifest is parsed in your browser.' },
  input: {
    label: 'package.json',
    sample: `{
  "name": "example-app",
  "version": "1.0.0",
  "private": true,
  "license": "MIT",
  "engines": { "node": ">=20.9.0" },
  "scripts": { "dev": "next dev", "build": "next build", "test": "vitest run" },
  "dependencies": {
    "next": "16.4.6",
    "react": "^19.3.1",
    "zod": "latest"
  },
  "devDependencies": {
    "typescript": "~5.9.3",
    "react": "^19.3.1"
  }
}`,
    rows: 18,
  },
  run(input): ToolResult {
    let manifest: Record<string, unknown>;
    try {
      manifest = JSON.parse(assertInput(input)) as Record<string, unknown>;
    } catch (error) {
      throw new ToolError(`package.json is not valid JSON: ${error instanceof Error ? error.message : 'parse error'}`);
    }
    const sections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;
    const warnings: string[] = [];
    const lines: string[] = [];
    lines.push(`Name: ${manifest.name ?? '(missing)'}`);
    lines.push(`Version: ${manifest.version ?? '(missing)'}`);
    lines.push(`License: ${manifest.license ?? '(missing)'}`);
    lines.push(`Private: ${manifest.private === true ? 'yes' : 'no'}`);
    lines.push(`Package manager: ${manifest.packageManager ?? '(not pinned)'}`);
    lines.push(`Node engines: ${(manifest.engines as Record<string, string> | undefined)?.node ?? '(not declared)'}`);
    if (!manifest.license) warnings.push('No license field. Add one before publishing.');
    if (!(manifest.engines as Record<string, string> | undefined)?.node) {
      warnings.push('No engines.node field; supported Node versions are unclear.');
    }
    const scripts = (manifest.scripts ?? {}) as Record<string, string>;
    lines.push('', `Scripts (${Object.keys(scripts).length})`);
    for (const [name, command] of Object.entries(scripts)) lines.push(`  ${name}: ${command}`);
    const allNames = new Map<string, string[]>();
    for (const section of sections) {
      const deps = (manifest[section] ?? {}) as Record<string, string>;
      const names = Object.keys(deps);
      if (names.length === 0) continue;
      lines.push('', `${section} (${names.length})`);
      for (const name of names) {
        const spec = deps[name];
        let style = 'range';
        if (spec === 'latest' || spec === '*' || spec === '') {
          style = 'unpinned';
          warnings.push(`${name} in ${section} uses "${spec || '(empty)'}".`);
        } else if (/^(git|https?|file|link|workspace):/.test(spec)) style = 'non-registry';
        else if (/^\d+\.\d+\.\d+/.test(spec)) style = 'exact';
        lines.push(`  ${name} ${spec} [${style}]`);
        allNames.set(name, [...(allNames.get(name) ?? []), section]);
      }
    }
    for (const [name, sectionsFound] of allNames) {
      if (sectionsFound.length > 1) {
        warnings.push(`${name} appears in ${sectionsFound.join(' and ')}.`);
      }
    }
    const total = [...allNames.keys()].length;
    lines.push('', `Unique dependencies: ${total}`);
    lines.push('', 'This tool reads the manifest only. It does not query the registry for vulnerabilities.');
    return {
      output: lines.join('\n'),
      meta: [
        { label: 'Dependencies', value: String(total) },
        { label: 'Scripts', value: String(Object.keys(scripts).length) },
      ],
      warnings,
    };
  },
  docs: {
    about:
      'Reports dependency range style, duplicate declarations, missing metadata and the script list from a package.json.',
    limitations: [
      'It does not resolve the dependency tree or check advisories. Run npm audit / pnpm audit for that.',
      'Registry URLs and workspace ranges are labelled but not validated.',
    ],
  },
};
