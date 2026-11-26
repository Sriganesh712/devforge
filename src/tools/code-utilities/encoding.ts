import {
  assertInput,
  bytesOf,
  optionBoolean,
  optionNumber,
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

export const urlCodec: ToolDefinition = {
  id: 'url-encoder',
  name: 'URL encoder & decoder',
  summary: 'Encode or decode URI components and full URLs, including query + as space.',
  category: 'code',
  version: '1.0.0',
  tags: ['url', 'encode', 'decode', 'uri', 'query'],
  aliases: ['percent encoding', 'urlencode', 'urldecode'],
  privacy: { locality: 'local', note: 'Encoded in your browser.' },
  input: {
    label: 'Text or URL',
    sample: `https://example.com/search?q=dev forge&tag=json&note=a+b`,
    rows: 6,
  },
  options: [
    {
      kind: 'select',
      id: 'mode',
      label: 'Mode',
      defaultValue: 'encode-component',
      choices: [
        { value: 'encode-component', label: 'Encode component' },
        { value: 'decode-component', label: 'Decode component' },
        { value: 'encode-uri', label: 'Encode full URI' },
        { value: 'decode-uri', label: 'Decode full URI' },
      ],
    },
    { kind: 'toggle', id: 'plus', label: 'Decode + as space', defaultValue: false },
  ],
  run(input, options): ToolResult {
    const source = assertInput(input);
    const mode = optionString(options, 'mode', 'encode-component');
    const plus = optionBoolean(options, 'plus');
    let output: string;
    try {
      if (mode === 'encode-component') output = encodeURIComponent(source);
      else if (mode === 'encode-uri') output = encodeURI(source);
      else {
        const prepared = plus ? source.replace(/\+/g, ' ') : source;
        output =
          mode === 'decode-uri' ? decodeURI(prepared) : decodeURIComponent(prepared);
      }
    } catch (error) {
      throw new ToolError(
        `Could not decode the input: ${error instanceof Error ? error.message : 'malformed escape sequence'}.`,
      );
    }
    return {
      output,
      meta: [
        { label: 'Mode', value: mode },
        { label: 'Bytes', value: String(bytesOf(output)) },
      ],
    };
  },
  docs: {
    about:
      'Uses the native encodeURI, encodeURIComponent, decodeURI and decodeURIComponent functions.',
    limitations: [
      'Decoding throws on malformed percent escapes instead of guessing.',
      'Plus-as-space is off by default because + is a literal character outside form encoding.',
    ],
  },
};

function toBinaryString(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return binary;
}

export function encodeBase64(text: string, urlSafe = false): string {
  const base64 = btoa(toBinaryString(new TextEncoder().encode(text)));
  return urlSafe ? base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : base64;
}

export function decodeBase64(text: string, urlSafe = false): string {
  let normalized = text.replace(/\s+/g, '');
  if (urlSafe) normalized = normalized.replace(/-/g, '+').replace(/_/g, '/');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    throw new ToolError('Input is not valid base64.');
  }
  normalized = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  let bytes: Uint8Array;
  try {
    const binary = atob(normalized);
    bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    throw new ToolError('Input is not valid base64.');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new ToolError('The decoded bytes are not valid UTF-8 text.');
  }
}

export const base64Codec: ToolDefinition = {
  id: 'base64-encoder',
  name: 'Base64 encoder & decoder',
  summary: 'Convert UTF-8 text to base64 and back, with URL-safe output.',
  category: 'code',
  version: '1.0.0',
  tags: ['base64', 'encode', 'decode', 'utf8'],
  aliases: ['b64', 'base64 decode'],
  privacy: { locality: 'local', note: 'Encoded in your browser.' },
  input: {
    label: 'Input',
    sample: 'DevForge — local-first developer tools ⚒',
    rows: 8,
  },
  options: [
    {
      kind: 'select',
      id: 'mode',
      label: 'Mode',
      defaultValue: 'encode',
      choices: [
        { value: 'encode', label: 'Encode' },
        { value: 'decode', label: 'Decode' },
      ],
    },
    { kind: 'toggle', id: 'urlSafe', label: 'URL-safe alphabet', defaultValue: false },
  ],
  run(input, options): ToolResult {
    const source = assertInput(input);
    const mode = optionString(options, 'mode', 'encode');
    const urlSafe = optionBoolean(options, 'urlSafe');
    const output = mode === 'encode' ? encodeBase64(source, urlSafe) : decodeBase64(source, urlSafe);
    return {
      output,
      meta: [
        { label: 'Mode', value: mode },
        { label: 'Bytes', value: String(bytesOf(output)) },
      ],
    };
  },
  docs: {
    about:
      'Encodes UTF-8 bytes, so emoji and non-Latin text round-trip correctly. URL-safe mode uses - and _ and drops padding.',
    limitations: [
      'Decoding rejects byte sequences that are not valid UTF-8; binary payloads are out of scope.',
      'Base64 is encoding, not encryption.',
    ],
  },
};

export function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto === 'undefined' || typeof crypto.getRandomValues !== 'function') {
    throw new ToolError('This browser does not expose a secure random source.');
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export const uuidGenerator: ToolDefinition = {
  id: 'uuid-generator',
  name: 'UUID generator',
  summary: 'Generate up to 100 cryptographically random UUID v4 values.',
  category: 'code',
  version: '1.0.0',
  tags: ['uuid', 'guid', 'random', 'id'],
  aliases: ['guid generator', 'uuid v4'],
  privacy: { locality: 'local', note: 'Generated with the browser crypto API.' },
  input: {
    label: 'Notes (not used)',
    sample: 'Generating identifiers for a seed script.',
    rows: 3,
  },
  options: [
    { kind: 'number', id: 'count', label: 'How many', defaultValue: 5, min: 1, max: 100 },
    { kind: 'toggle', id: 'uppercase', label: 'Uppercase', defaultValue: false },
  ],
  run(_input, options): ToolResult {
    const count = Math.round(optionNumber(options, 'count', 5));
    if (!Number.isFinite(count) || count < 1 || count > 100) {
      throw new ToolError('Choose between 1 and 100 UUIDs.');
    }
    const uppercase = optionBoolean(options, 'uppercase');
    const values = Array.from({ length: count }, () => {
      const uuid = randomUuid();
      return uppercase ? uuid.toUpperCase() : uuid;
    });
    return {
      output: values.join('\n'),
      meta: [{ label: 'Generated', value: String(values.length) }],
    };
  },
  docs: {
    about: 'UUID v4 with 122 bits of randomness from crypto.randomUUID or crypto.getRandomValues.',
    limitations: ['Version 1, 5 and 7 UUIDs are not generated by this tool.'],
  },
};

function relative(date: Date): string {
  const deltaSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ];
  for (const [unit, seconds] of units) {
    if (Math.abs(deltaSeconds) >= seconds || unit === 'second') {
      return formatter.format(Math.round(deltaSeconds / seconds), unit);
    }
  }
  return 'now';
}

export function parseTimestamp(input: string, unit: 'auto' | 'seconds' | 'millis' = 'auto'): Date {
  const value = input.trim();
  if (!value) throw new ToolError('Add a timestamp or date string.');
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const number = Number(value);
    const resolved =
      unit === 'seconds'
        ? number * 1000
        : unit === 'millis'
          ? number
          : Math.abs(number) >= 1e11
            ? number
            : number * 1000;
    const date = new Date(resolved);
    if (Number.isNaN(date.getTime())) throw new ToolError('Numeric timestamp is out of range.');
    return date;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ToolError('Could not parse that date. Use an ISO 8601 string or a Unix timestamp.');
  }
  return date;
}

export const timestampConverter: ToolDefinition = {
  id: 'timestamp-converter',
  name: 'Timestamp converter',
  summary: 'Convert Unix seconds, milliseconds and ISO dates in both directions.',
  category: 'code',
  version: '1.0.0',
  tags: ['timestamp', 'unix', 'date', 'iso', 'epoch'],
  aliases: ['epoch converter', 'unix time'],
  privacy: { locality: 'local', note: 'Converted in your browser.' },
  input: {
    label: 'Timestamp or date',
    sample: '2026-11-26T09:30:00Z',
    rows: 3,
  },
  options: [
    {
      kind: 'select',
      id: 'unit',
      label: 'Numeric unit',
      defaultValue: 'auto',
      choices: [
        { value: 'auto', label: 'Auto-detect' },
        { value: 'seconds', label: 'Seconds' },
        { value: 'millis', label: 'Milliseconds' },
      ],
    },
  ],
  run(input, options): ToolResult {
    const unit = optionString(options, 'unit', 'auto') as 'auto' | 'seconds' | 'millis';
    const date = parseTimestamp(assertInput(input), unit);
    const seconds = Math.floor(date.getTime() / 1000);
    const output = [
      `ISO 8601 (UTC):   ${date.toISOString()}`,
      `Local time:       ${date.toLocaleString()}`,
      `Unix seconds:     ${seconds}`,
      `Unix millis:      ${date.getTime()}`,
      `UTC date:         ${date.toUTCString()}`,
      `Relative:         ${relative(date)}`,
    ].join('\n');
    return {
      output,
      meta: [
        { label: 'Weekday', value: date.toLocaleDateString('en', { weekday: 'long' }) },
        { label: 'Timezone offset', value: `${-date.getTimezoneOffset() / 60} h` },
      ],
    };
  },
  docs: {
    about:
      'Numbers with 11 or more digits are treated as milliseconds in auto mode. ISO strings without a timezone follow the JavaScript Date rules.',
    limitations: [
      'Auto-detection is a length heuristic; choose the unit explicitly when in doubt.',
      'Local output depends on the operating system timezone.',
    ],
  },
};
