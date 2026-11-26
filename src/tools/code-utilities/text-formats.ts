import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import {
  assertInput,
  optionBoolean,
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

export const yamlFormatter: ToolDefinition = {
  id: 'yaml-formatter',
  name: 'YAML formatter',
  summary: 'Format, validate or convert YAML with line-aware parse errors.',
  category: 'code',
  version: '1.0.0',
  tags: ['yaml', 'format', 'validate', 'json'],
  aliases: ['yml formatter', 'yaml lint', 'yaml to json'],
  privacy: { locality: 'local', note: 'Parsed locally with the yaml package.' },
  input: {
    label: 'YAML input',
    sample: `service: devforge
version: 0.1.0
enabled: true
ports:
  - 3000
  - 3001
owners: [core, docs]
`,
    rows: 12,
  },
  options: [
    {
      kind: 'select',
      id: 'mode',
      label: 'Mode',
      defaultValue: 'format',
      choices: [
        { value: 'format', label: 'Format' },
        { value: 'json', label: 'To JSON' },
        { value: 'validate', label: 'Validate only' },
      ],
    },
    {
      kind: 'select',
      id: 'indent',
      label: 'Indent',
      defaultValue: '2',
      choices: [
        { value: '2', label: '2 spaces' },
        { value: '4', label: '4 spaces' },
      ],
    },
    { kind: 'toggle', id: 'sort', label: 'Sort keys', defaultValue: false },
  ],
  run(input, options): ToolResult {
    const source = assertInput(input);
    let value: unknown;
    try {
      value = parseYaml(source, { prettyErrors: true });
    } catch (error) {
      throw new ToolError(error instanceof Error ? error.message : 'Invalid YAML.');
    }
    const mode = optionString(options, 'mode', 'format');
    if (mode === 'validate') {
      return {
        output: 'Valid YAML',
        meta: [{ label: 'Result', value: 'valid' }],
      };
    }
    if (mode === 'json') {
      return { output: JSON.stringify(value, null, 2), language: 'json' };
    }
    if (optionBoolean(options, 'sort')) {
      value = sortKeys(value);
    }
    const output = stringifyYaml(value, {
      indent: Number(optionString(options, 'indent', '2')),
      lineWidth: 0,
    });
    return { output, meta: [{ label: 'Bytes', value: String(new TextEncoder().encode(output).length) }] };
  },
  docs: {
    about:
      'Uses the yaml package for parsing and emission. Formatting never silently repairs invalid documents.',
    limitations: [
      'Anchors and tags are supported by the parser but may be re-emitted differently.',
      'YAML 1.2 core schema is used.',
    ],
  },
};

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, child]) => [key, sortKeys(child)]),
    );
  }
  return value;
}

type XmlToken = { type: 'open' | 'close' | 'self' | 'text' | 'decl' | 'comment'; value: string };

function tokenizeXml(source: string): XmlToken[] {
  const tokens: XmlToken[] = [];
  let index = 0;
  while (index < source.length) {
    const next = source.indexOf('<', index);
    if (next === -1) {
      const text = source.slice(index);
      if (text.trim()) tokens.push({ type: 'text', value: text.trim() });
      break;
    }
    if (next > index) {
      const text = source.slice(index, next);
      if (text.trim()) tokens.push({ type: 'text', value: text.trim() });
    }
    if (source.startsWith('<!--', next)) {
      const end = source.indexOf('-->', next + 4);
      if (end === -1) throw new ToolError('Unclosed XML comment.');
      tokens.push({ type: 'comment', value: source.slice(next, end + 3) });
      index = end + 3;
      continue;
    }
    if (source.startsWith('<![CDATA[', next)) {
      const end = source.indexOf(']]>', next + 9);
      if (end === -1) throw new ToolError('Unclosed CDATA section.');
      tokens.push({ type: 'text', value: source.slice(next, end + 3) });
      index = end + 3;
      continue;
    }
    if (source.startsWith('<?', next)) {
      const end = source.indexOf('?>', next + 2);
      if (end === -1) throw new ToolError('Unclosed XML processing instruction.');
      tokens.push({ type: 'decl', value: source.slice(next, end + 2) });
      index = end + 2;
      continue;
    }
    if (source.startsWith('<!', next)) {
      const end = source.indexOf('>', next + 2);
      if (end === -1) throw new ToolError('Unclosed XML declaration.');
      tokens.push({ type: 'decl', value: source.slice(next, end + 1) });
      index = end + 1;
      continue;
    }
    // Scan the tag while respecting quoted attribute values.
    let cursor = next + 1;
    let quote: string | null = null;
    while (cursor < source.length) {
      const char = source[cursor];
      if (quote) {
        if (char === quote) quote = null;
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '>') {
        break;
      }
      cursor += 1;
    }
    if (cursor >= source.length) throw new ToolError('Unclosed XML tag.');
    const raw = source.slice(next, cursor + 1);
    if (raw.startsWith('</')) tokens.push({ type: 'close', value: raw });
    else if (raw.endsWith('/>')) tokens.push({ type: 'self', value: raw });
    else tokens.push({ type: 'open', value: raw });
    index = cursor + 1;
  }
  return tokens;
}

function validateXml(tokens: XmlToken[]): void {
  const stack: string[] = [];
  for (const token of tokens) {
    if (token.type === 'open') {
      const name = /^<\s*([^\s/>]+)/.exec(token.value)?.[1];
      if (!name) throw new ToolError(`Could not read tag name in: ${token.value.slice(0, 40)}`);
      stack.push(name);
    } else if (token.type === 'close') {
      const name = /^<\/\s*([^\s>]+)/.exec(token.value)?.[1];
      const open = stack.pop();
      if (!open || !name || open !== name) {
        throw new ToolError(
          `Mismatched closing tag </${name ?? '?'}>. Expected ${open ? `</${open}>` : 'no closing tag'}.`,
        );
      }
    }
  }
  if (stack.length > 0) throw new ToolError(`Unclosed tag <${stack[stack.length - 1]}>.`);
}

function formatXml(source: string, indentValue: string): string {
  const tokens = tokenizeXml(source);
  validateXml(tokens);
  const indent = indentValue === 'tab' ? '\t' : ' '.repeat(Number(indentValue) || 2);
  const lines: string[] = [];
  let depth = 0;
  for (const token of tokens) {
    if (token.type === 'close') depth = Math.max(0, depth - 1);
    lines.push(`${indent.repeat(depth)}${token.value}`);
    if (token.type === 'open') depth += 1;
  }
  return lines.join('\n');
}

export const xmlFormatter: ToolDefinition = {
  id: 'xml-formatter',
  name: 'XML formatter',
  summary: 'Pretty-print or minify XML, with tag-balance validation and clear errors.',
  category: 'code',
  version: '1.0.0',
  tags: ['xml', 'format', 'minify', 'validate'],
  aliases: ['xml pretty print', 'xml beautify'],
  privacy: { locality: 'local', note: 'Parsed in your browser.' },
  input: {
    label: 'XML input',
    sample: `<catalog><book id="1"><title>Refactoring</title><author>Martin Fowler</author></book><book id="2"><title>Designing Data-Intensive Applications</title></book></catalog>`,
    rows: 10,
  },
  options: [
    {
      kind: 'select',
      id: 'mode',
      label: 'Mode',
      defaultValue: 'format',
      choices: [
        { value: 'format', label: 'Format' },
        { value: 'minify', label: 'Minify' },
        { value: 'validate', label: 'Validate only' },
      ],
    },
    {
      kind: 'select',
      id: 'indent',
      label: 'Indent',
      defaultValue: '2',
      choices: [
        { value: '2', label: '2 spaces' },
        { value: '4', label: '4 spaces' },
        { value: 'tab', label: 'Tab' },
      ],
    },
  ],
  run(input, options): ToolResult {
    const source = assertInput(input);
    const tokens = tokenizeXml(source);
    validateXml(tokens);
    const mode = optionString(options, 'mode', 'format');
    if (mode === 'validate') {
      return { output: 'Well-formed XML', meta: [{ label: 'Result', value: 'well-formed' }] };
    }
    if (mode === 'minify') {
      const output = source
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/>\s+</g, '><')
        .trim();
      return { output, meta: [{ label: 'Bytes', value: String(new TextEncoder().encode(output).length) }] };
    }
    return {
      output: formatXml(source, optionString(options, 'indent', '2')),
      meta: [{ label: 'Elements', value: String(tokens.filter((token) => token.type === 'open').length) }],
    };
  },
  docs: {
    about:
      'A dependency-free tokenizer that respects quoted attributes, comments, CDATA and processing instructions.',
    limitations: [
      'Checks well-formedness, not a DTD or XSD schema.',
      'Pretty-printing mixed content (text and elements in one tag) inserts line breaks; minify preserves content.',
    ],
  },
};

function detectDelimiter(firstLine: string): string {
  const candidates = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = -1;
  for (const candidate of candidates) {
    const count = firstLine.split(candidate).length - 1;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

export function parseCsv(source: string, delimiter?: string): string[][] {
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const sep = delimiter && delimiter !== 'auto' ? delimiter : detectDelimiter(text.split('\n')[0] ?? '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === sep) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (quoted) throw new ToolError('Unclosed quoted field in CSV.');
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((cell) => cell.trim() !== ''));
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export const csvViewer: ToolDefinition = {
  id: 'csv-viewer',
  name: 'CSV converter',
  summary: 'Parse CSV with quoted fields and convert it to JSON, Markdown or TSV.',
  category: 'code',
  version: '1.0.0',
  tags: ['csv', 'json', 'markdown', 'tsv', 'table'],
  aliases: ['csv to json', 'csv viewer'],
  privacy: { locality: 'local', note: 'Parsed in your browser.' },
  input: {
    label: 'CSV input',
    sample: `name,role,location
Ada Lovelace,Engineer,London
Grace Hopper,Engineer,"New York, NY"
Linus Torvalds,Maintainer,Helsinki`,
    rows: 12,
  },
  options: [
    {
      kind: 'select',
      id: 'target',
      label: 'Output',
      defaultValue: 'json',
      choices: [
        { value: 'json', label: 'JSON array' },
        { value: 'markdown', label: 'Markdown table' },
        { value: 'tsv', label: 'TSV' },
      ],
    },
    {
      kind: 'select',
      id: 'delimiter',
      label: 'Delimiter',
      defaultValue: 'auto',
      choices: [
        { value: 'auto', label: 'Detect' },
        { value: ',', label: 'Comma' },
        { value: ';', label: 'Semicolon' },
        { value: '\t', label: 'Tab' },
        { value: '|', label: 'Pipe' },
      ],
    },
    { kind: 'toggle', id: 'header', label: 'First row is a header', defaultValue: true },
  ],
  run(input, options): ToolResult {
    const rows = parseCsv(assertInput(input), optionString(options, 'delimiter', 'auto'));
    if (rows.length === 0) throw new ToolError('No rows found in the CSV input.');
    const hasHeader = optionBoolean(options, 'header', true);
    const header = hasHeader ? rows[0] : rows[0].map((_, index) => `column_${index + 1}`);
    const dataRows = hasHeader ? rows.slice(1) : rows;
    const target = optionString(options, 'target', 'json');
    const width = Math.max(...rows.map((row) => row.length));
    const normalized = dataRows.map((row) =>
      Array.from({ length: width }, (_, index) => row[index] ?? ''),
    );

    if (target === 'json') {
      const objects = normalized.map((row) =>
        Object.fromEntries(header.map((key, index) => [key || `column_${index + 1}`, row[index]])),
      );
      return {
        output: JSON.stringify(objects, null, 2),
        language: 'json',
        meta: [
          { label: 'Rows', value: String(dataRows.length) },
          { label: 'Columns', value: String(width) },
        ],
        warnings:
          width !== header.length
            ? ['Some rows have a different number of columns than the header; missing cells are empty.']
            : undefined,
      };
    }

    if (target === 'tsv') {
      const output = [header, ...normalized].map((row) => row.join('\t')).join('\n');
      return { output, meta: [{ label: 'Rows', value: String(dataRows.length) }] };
    }

    const head = `| ${header.map(escapeMarkdownCell).join(' | ')} |`;
    const separator = `| ${header.map(() => '---').join(' | ')} |`;
    const body = normalized.map(
      (row) => `| ${row.map((cell) => escapeMarkdownCell(cell)).join(' | ')} |`,
    );
    return {
      output: [head, separator, ...body].join('\n'),
      language: 'markdown',
      meta: [{ label: 'Rows', value: String(dataRows.length) }],
    };
  },
  docs: {
    about:
      'A small RFC 4180-style parser: quoted fields, escaped quotes and newlines inside quotes are handled.',
    limitations: [
      'Delimiter detection looks at the first line only.',
      'Type inference is not performed; every cell is emitted as a string.',
    ],
  },
};
