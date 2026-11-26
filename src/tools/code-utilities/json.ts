import {
  assertInput,
  optionBoolean,
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

function parseJson(text: string, label = 'Input'): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown parse error';
    const position = /position (\d+)/.exec(message)?.[1];
    let location = '';
    if (position) {
      const offset = Number(position);
      const before = text.slice(0, offset);
      const line = before.split('\n').length;
      const column = offset - before.lastIndexOf('\n');
      location = ` at line ${line}, column ${column}`;
    }
    throw new ToolError(`${label} is not valid JSON${location}: ${message}`);
  }
}

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

function depthOf(value: unknown): number {
  if (Array.isArray(value)) {
    return 1 + Math.max(0, ...value.map(depthOf));
  }
  if (value && typeof value === 'object') {
    return 1 + Math.max(0, ...Object.values(value as Record<string, unknown>).map(depthOf));
  }
  return 0;
}

export const jsonFormatter: ToolDefinition = {
  id: 'json-formatter',
  name: 'JSON formatter',
  summary: 'Format, minify, sort or validate JSON with a precise error location.',
  category: 'code',
  version: '1.0.0',
  tags: ['json', 'format', 'validate', 'minify', 'sort'],
  aliases: ['json pretty', 'json beautify', 'json lint'],
  privacy: { locality: 'local', note: 'Parsed in your browser. Nothing is uploaded.' },
  featured: true,
  input: {
    label: 'JSON input',
    sample: `{"name":"devforge","version":"0.1.0","tools":[{"id":"json-formatter","local":true}],"meta":{"stars":0,"license":"Apache-2.0"}}`,
    rows: 14,
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
        { value: 'sort', label: 'Sort keys' },
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
    const parsed = parseJson(source);
    const mode = optionString(options, 'mode', 'format');
    const indentValue = optionString(options, 'indent', '2');
    const indent = indentValue === 'tab' ? '\t' : Number(indentValue);

    if (mode === 'validate') {
      const type = Array.isArray(parsed) ? 'array' : parsed === null ? 'null' : typeof parsed;
      const keys =
        parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? Object.keys(parsed as Record<string, unknown>).length
          : 0;
      return {
        output: [
          'Valid JSON',
          `Root type: ${type}`,
          `Top-level keys: ${keys}`,
          `Max depth: ${depthOf(parsed)}`,
          `Bytes: ${new TextEncoder().encode(source).length}`,
        ].join('\n'),
        meta: [{ label: 'Result', value: 'valid' }],
      };
    }

    const value = mode === 'sort' ? sortKeys(parsed) : parsed;
    const output =
      mode === 'minify' ? JSON.stringify(value) : JSON.stringify(value, null, indent);
    return {
      output,
      meta: [
        { label: 'Mode', value: mode },
        { label: 'Bytes', value: String(new TextEncoder().encode(output).length) },
      ],
    };
  },
  docs: {
    about:
      'Parses with the native JSON parser, so the output is always valid JSON. Sort keys is recursive and stable for string keys.',
    limitations: [
      'JSON.parse rejects comments and trailing commas, as the JSON specification does.',
      'Sorting changes key order only; array order is preserved.',
    ],
  },
};

type Change = { path: string; kind: 'added' | 'removed' | 'changed'; detail: string };

function compareValues(a: unknown, b: unknown, path: string, changes: Change[]): void {
  if (changes.length >= 300) return;
  if (a === b) return;
  if (a === undefined) {
    changes.push({ path, kind: 'added', detail: JSON.stringify(b) });
    return;
  }
  if (b === undefined) {
    changes.push({ path, kind: 'removed', detail: JSON.stringify(a) });
    return;
  }
  if (typeof a !== typeof b || a === null || b === null) {
    changes.push({ path, kind: 'changed', detail: `${JSON.stringify(a)} → ${JSON.stringify(b)}` });
    return;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const max = Math.max(a.length, b.length);
    for (let index = 0; index < max; index += 1) {
      compareValues(a[index], b[index], `${path}[${index}]`, changes);
    }
    return;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    changes.push({ path, kind: 'changed', detail: 'array shape differs' });
    return;
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      compareValues(left[key], right[key], `${path}.${key}`, changes);
    }
    return;
  }
  changes.push({ path, kind: 'changed', detail: `${JSON.stringify(a)} → ${JSON.stringify(b)}` });
}

export const jsonDiff: ToolDefinition = {
  id: 'json-diff',
  name: 'JSON diff',
  summary: 'Compare two JSON documents by path and see added, removed and changed values.',
  category: 'code',
  version: '1.0.0',
  tags: ['json', 'diff', 'compare'],
  aliases: ['json compare', 'json patch'],
  privacy: { locality: 'local', note: 'Both documents stay in your browser.' },
  ui: 'compare',
  input: {
    label: 'Original JSON',
    sample: `{"name":"devforge","version":"0.1.0","tools":["json","yaml"],"license":"MIT"}`,
    rows: 10,
    secondary: {
      label: 'Changed JSON',
      sample: `{"name":"devforge","version":"0.2.0","tools":["json","yaml","xml"],"license":"MIT","stars":0}`,
    },
  },
  run(input, _options, secondary): ToolResult {
    const left = parseJson(assertInput(input, 'Original JSON'), 'Original JSON');
    const right = parseJson(assertInput(secondary ?? '', 'Changed JSON'), 'Changed JSON');
    const changes: Change[] = [];
    compareValues(left, right, '$', changes);
    if (changes.length === 0) {
      return { output: 'No differences.', meta: [{ label: 'Changes', value: '0' }] };
    }
    const lines = changes.map((change) => {
      const marker = change.kind === 'added' ? '+' : change.kind === 'removed' ? '-' : '~';
      return `${marker} ${change.path}  ${change.detail}`;
    });
    const truncated = changes.length >= 300;
    if (truncated) lines.push('… change list truncated at 300 entries');
    return {
      output: lines.join('\n'),
      meta: [{ label: 'Changes', value: String(changes.length) }],
      warnings: truncated ? ['Only the first 300 differences are shown.'] : undefined,
    };
  },
  docs: {
    about:
      'A structural comparison, not a text diff. Object key order is ignored and array indices are compared in place.',
    limitations: [
      'Arrays are compared by index; a moved item appears as changed values rather than a move.',
      'The report is capped at 300 entries.',
    ],
  },
};

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function propertyName(key: string): string {
  return IDENTIFIER.test(key) ? key : JSON.stringify(key);
}

function pascal(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9]+/g, ' ').trim();
  const name = cleaned
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
  return name || 'Item';
}

interface TypeBuilder {
  interfaces: string[];
  usedNames: Set<string>;
}

function uniqueName(base: string, builder: TypeBuilder): string {
  let name = pascal(base);
  let counter = 2;
  while (builder.usedNames.has(name)) {
    name = `${pascal(base)}${counter}`;
    counter += 1;
  }
  builder.usedNames.add(name);
  return name;
}

function inferType(value: unknown, nameHint: string, builder: TypeBuilder): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    const memberTypes = [...new Set(value.map((item) => inferType(item, nameHint, builder)))];
    return `(${memberTypes.join(' | ')})[]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return 'Record<string, unknown>';
    const name = uniqueName(nameHint, builder);
    const body = entries
      .map(([key, child]) => `  ${propertyName(key)}: ${inferType(child, `${name} ${key}`, builder)};`)
      .join('\n');
    builder.interfaces.unshift(`export interface ${name} {\n${body}\n}`);
    return name;
  }
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'unknown';
}

export const jsonToTypescript: ToolDefinition = {
  id: 'json-to-typescript',
  name: 'JSON to TypeScript',
  summary: 'Infer TypeScript interfaces from a JSON sample, including nested objects and arrays.',
  category: 'code',
  version: '1.0.0',
  tags: ['json', 'typescript', 'types', 'codegen'],
  aliases: ['json2ts', 'json to interface'],
  privacy: { locality: 'local', note: 'Conversion happens in your browser.' },
  input: {
    label: 'JSON sample',
    sample: `{"id":1,"name":"Ada","roles":["admin","maintainer"],"profile":{"active":true,"joined":"2024-01-05"},"manager":null}`,
    rows: 12,
  },
  options: [
    { kind: 'text', id: 'root', label: 'Root type name', defaultValue: 'Root' },
    {
      kind: 'select',
      id: 'style',
      label: 'Output',
      defaultValue: 'interface',
      choices: [
        { value: 'interface', label: 'Interfaces' },
        { value: 'type', label: 'Type aliases' },
      ],
    },
  ],
  run(input, options): ToolResult {
    const parsed = parseJson(assertInput(input));
    const builder: TypeBuilder = { interfaces: [], usedNames: new Set() };
    const rootName = pascal(optionString(options, 'root', 'Root'));
    builder.usedNames.add(rootName);
    const rootType = inferType(parsed, rootName, builder);
    let blocks = [...builder.interfaces];
    if (optionString(options, 'style', 'interface') === 'type') {
      blocks = blocks.map((block) =>
        block
          .replace(/^export interface (\w+) \{/, 'export type $1 = {')
          .replace(/\n\}$/, '\n};'),
      );
    }
    const rootDeclaration =
      rootType === rootName ? '' : `export type ${rootName} = ${rootType};\n\n`;
    const output = `${blocks.join('\n\n')}\n\n${rootDeclaration}`.trim();
    return {
      output,
      meta: [
        { label: 'Types', value: String(builder.usedNames.size) },
        { label: 'Root', value: rootName },
      ],
    };
  },
  docs: {
    about:
      'Walks the sample and emits named interfaces. Arrays with mixed element types become unions; null becomes null.',
    limitations: [
      'Types come from one sample, so optional or unseen fields cannot be detected.',
      'Objects inside arrays are named from the property that holds them and may need renaming.',
    ],
  },
};
