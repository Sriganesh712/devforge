import {
  assertInput,
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';
import { parseHeaderLines, redactHeaders } from '@/packages/core/http';

export { parseHeaderLines, redactHeaders };

export interface ParsedCurl {
  method: string;
  url: string;
  headers: Array<{ name: string; value: string }>;
  body?: string;
  warnings: string[];
}

function shellTokens(source: string): string[] {
  const text = source.replace(/\\\r?\n/g, ' ').trim();
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let started = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote === "'") {
      if (char === "'") quote = null;
      else current += char;
      continue;
    }
    if (quote === '"') {
      if (char === '"') {
        quote = null;
      } else if (char === '\\' && index + 1 < text.length) {
        const next = text[index + 1];
        if (next === '"' || next === '\\' || next === '$' || next === '`') {
          current += next;
          index += 1;
        } else if (next === 'n') {
          current += '\n';
          index += 1;
        } else {
          current += char;
        }
      } else {
        current += char;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      started = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (started) {
        tokens.push(current);
        current = '';
        started = false;
      }
      continue;
    }
    if (char === '\\' && index + 1 < text.length) {
      current += text[index + 1];
      index += 1;
      started = true;
      continue;
    }
    current += char;
    started = true;
  }
  if (quote) throw new ToolError('Unclosed quote in the cURL command.');
  if (started) tokens.push(current);
  return tokens;
}

const VALUE_FLAGS = new Set([
  '-o',
  '--output',
  '-w',
  '--write-out',
  '-m',
  '--max-time',
  '--connect-timeout',
  '-e',
  '--referer',
  '--retry',
  '-c',
  '--cookie-jar',
  '-x',
  '--proxy',
  '--resolve',
  '--cacert',
  '--cert',
  '--key',
  '-F',
  '--form',
]);

export function parseCurl(source: string): ParsedCurl {
  const tokens = shellTokens(assertInput(source, 'cURL command'));
  if (tokens[0]?.toLowerCase() === 'curl') tokens.shift();
  let method = '';
  let url = '';
  let body: string | undefined;
  let dataAsQuery = false;
  const headers: Array<{ name: string; value: string }> = [];
  const warnings: string[] = [];

  const addHeader = (raw: string) => {
    const colon = raw.indexOf(':');
    if (colon === -1) throw new ToolError(`Header "${raw}" is missing a colon.`);
    const name = raw.slice(0, colon).trim();
    const value = raw.slice(colon + 1).trim();
    if (!name) throw new ToolError('Header name is empty.');
    headers.push({ name, value });
  };

  for (let index = 0; index < tokens.length; index += 1) {
    let token = tokens[index];
    if (!token.startsWith('-')) {
      if (!url) url = token;
      else warnings.push(`Ignored extra argument "${token}".`);
      continue;
    }
    let inlineValue: string | undefined;
    if (token.startsWith('--') && token.includes('=')) {
      const eq = token.indexOf('=');
      inlineValue = token.slice(eq + 1);
      token = token.slice(0, eq);
    }
    const nextValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      const value = tokens[index + 1];
      if (value === undefined) throw new ToolError(`Flag ${token} expects a value.`);
      index += 1;
      return value;
    };
    switch (token) {
      case '-X':
      case '--request':
        method = nextValue().toUpperCase();
        break;
      case '-H':
      case '--header':
        addHeader(nextValue());
        break;
      case '-d':
      case '--data':
      case '--data-raw':
      case '--data-binary':
      case '--data-ascii': {
        const value = nextValue();
        body = body === undefined ? value : `${body}&${value}`;
        break;
      }
      case '--data-urlencode': {
        const value = nextValue();
        const [key, ...rest] = value.split('=');
        const encoded = rest.length
          ? `${encodeURIComponent(key)}=${encodeURIComponent(rest.join('='))}`
          : encodeURIComponent(value);
        body = body === undefined ? encoded : `${body}&${encoded}`;
        break;
      }
      case '-G':
      case '--get':
        dataAsQuery = true;
        break;
      case '-u':
      case '--user': {
        const value = nextValue();
        try {
          const encoded = btoa(unescape(encodeURIComponent(value)));
          headers.push({ name: 'Authorization', value: `Basic ${encoded}` });
          warnings.push('Basic auth was converted into an Authorization header. Treat the output as a secret.');
        } catch {
          warnings.push('Basic auth could not be encoded; add the Authorization header manually.');
        }
        break;
      }
      case '-b':
      case '--cookie':
        headers.push({ name: 'Cookie', value: nextValue() });
        break;
      case '-A':
      case '--user-agent':
        headers.push({ name: 'User-Agent', value: nextValue() });
        break;
      case '-I':
      case '--head':
        method = 'HEAD';
        break;
      case '-L':
      case '--location':
      case '-k':
      case '--insecure':
      case '-s':
      case '--silent':
      case '-S':
      case '--show-error':
      case '--compressed':
      case '-i':
      case '--include':
      case '-v':
      case '--verbose':
        if (token === '-k' || token === '--insecure') {
          warnings.push('-k disables TLS verification. Browsers do not allow this, and the generated code does not either.');
        }
        break;
      case '-F':
      case '--form': {
        nextValue();
        warnings.push('Multipart form fields are not supported. Build a FormData request manually.');
        break;
      }
      default: {
        if (VALUE_FLAGS.has(token)) {
          nextValue();
          warnings.push(`Flag ${token} is not represented in the generated code.`);
        } else if (/^-[A-Za-z]{2,}$/.test(token)) {
          warnings.push(`Combined short flags ${token} are not parsed; split them into separate flags.`);
        } else {
          warnings.push(`Unknown flag ${token} was ignored.`);
        }
      }
    }
  }

  if (!url) throw new ToolError('No URL found in the cURL command.');
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new ToolError('The cURL URL is not a valid absolute URL.');
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new ToolError('Only http and https URLs are supported.');
  }
  if (dataAsQuery && body) {
    const params = new URLSearchParams(body);
    params.forEach((value, key) => parsedUrl.searchParams.append(key, value));
    url = parsedUrl.toString();
    body = undefined;
  }
  if (!method) method = body !== undefined ? 'POST' : 'GET';
  if (method === 'GET' && body !== undefined) {
    warnings.push('A GET request with a body was generated; many servers ignore it. Use -G to send data as query parameters.');
  }
  return { method, url, headers, body, warnings };
}

function headerObject(headers: Array<{ name: string; value: string }>, indent = 4): string {
  if (headers.length === 0) return '{}';
  const lines = headers.map(
    (header) => `${' '.repeat(indent + 2)}${JSON.stringify(header.name)}: ${JSON.stringify(header.value)},`,
  );
  return `{\n${lines.join('\n')}\n${' '.repeat(indent)}}`;
}

function pythonString(value: string): string {
  return JSON.stringify(value);
}

export function curlToCode(
  parsed: ParsedCurl,
  target: 'fetch' | 'python' | 'raw',
): string {
  if (target === 'fetch') {
    const options: string[] = [`  method: ${JSON.stringify(parsed.method)},`];
    if (parsed.headers.length > 0) {
      options.push(`  headers: ${headerObject(parsed.headers, 2)},`);
    }
    if (parsed.body !== undefined) options.push(`  body: ${JSON.stringify(parsed.body)},`);
    return [
      '// Generated from cURL by DevForge. Review credentials before sharing.',
      `const response = await fetch(${JSON.stringify(parsed.url)}, {`,
      ...options,
      '});',
      '',
      'const text = await response.text();',
      'console.log(response.status, text);',
    ].join('\n');
  }
  if (target === 'python') {
    const args: string[] = [pythonString(parsed.url)];
    if (parsed.headers.length > 0) {
      const entries = parsed.headers
        .map((header) => `    ${pythonString(header.name)}: ${pythonString(header.value)},`)
        .join('\n');
      args.push(`headers={\n${entries}\n}`);
    }
    if (parsed.body !== undefined) args.push(`data=${pythonString(parsed.body)}`);
    return [
      '# Generated from cURL by DevForge. Review credentials before sharing.',
      'import requests',
      '',
      `response = requests.${parsed.method.toLowerCase()}(${args.join(', ')})`,
      'print(response.status_code)',
      'print(response.text)',
    ].join('\n');
  }
  const url = new URL(parsed.url);
  const lines = [
    `${parsed.method} ${url.pathname}${url.search} HTTP/1.1`,
    `Host: ${url.host}`,
  ];
  for (const header of parsed.headers) lines.push(`${header.name}: ${header.value}`);
  if (parsed.body !== undefined) {
    lines.push(`Content-Length: ${new TextEncoder().encode(parsed.body).length}`, '', parsed.body);
  }
  return lines.join('\n');
}

export const curlConverter: ToolDefinition = {
  id: 'curl-converter',
  name: 'cURL converter',
  summary: 'Convert a cURL command into fetch, Python requests or raw HTTP.',
  category: 'api',
  version: '1.0.0',
  tags: ['curl', 'fetch', 'python', 'http', 'convert'],
  aliases: ['curl to fetch', 'curl to code'],
  privacy: { locality: 'local', note: 'Parsed locally. The command is never executed.' },
  input: {
    label: 'cURL command',
    sample: `curl -X POST https://api.example.com/v1/tasks \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer demo-token" \\
  -d '{"title":"Review the alpha","priority":"high"}'`,
    rows: 10,
  },
  options: [
    {
      kind: 'select',
      id: 'target',
      label: 'Generate',
      defaultValue: 'fetch',
      choices: [
        { value: 'fetch', label: 'JavaScript fetch' },
        { value: 'python', label: 'Python requests' },
        { value: 'raw', label: 'Raw HTTP' },
      ],
    },
  ],
  run(input, options): ToolResult {
    const parsed = parseCurl(input);
    const target = optionString(options, 'target', 'fetch') as 'fetch' | 'python' | 'raw';
    return {
      output: curlToCode(parsed, target),
      meta: [
        { label: 'Method', value: parsed.method },
        { label: 'Headers', value: String(parsed.headers.length) },
      ],
      warnings: parsed.warnings,
      language: target === 'python' ? 'python' : target === 'fetch' ? 'javascript' : 'http',
    };
  },
  docs: {
    about:
      'A focused cURL parser for the common request flags: -X, -H, -d, -G, -u, -b, -A and --data-urlencode.',
    limitations: [
      'Multipart forms (-F), file uploads (@file), proxies and client certificates are not converted.',
      'Generated Authorization headers contain credentials; do not paste the output into public places.',
    ],
  },
};

export function buildCurl(request: {
  method: string;
  url: string;
  headers: Array<{ name: string; value: string }>;
  body?: string;
}): string {
  const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;
  const parts = ['curl', '-X', request.method.toUpperCase(), quote(request.url)];
  for (const header of request.headers) {
    parts.push('-H', quote(`${header.name}: ${header.value}`));
  }
  if (request.body) parts.push('--data-raw', quote(request.body));
  return parts.join(' ');
}

export const httpClient: ToolDefinition = {
  id: 'http-client',
  name: 'HTTP request builder',
  summary: 'Send real HTTP requests from your browser and inspect status, headers, body and timing.',
  category: 'api',
  version: '1.0.0',
  tags: ['http', 'rest', 'api', 'fetch', 'request'],
  aliases: ['rest client', 'api tester', 'postman'],
  privacy: {
    locality: 'browser-network',
    note: 'Requests go directly from your browser to the URL you enter. DevForge does not proxy them.',
  },
  ui: 'http',
  featured: true,
  input: {
    label: 'Request URL',
    sample: 'https://api.github.com/repos/vercel/next.js',
    rows: 2,
  },
  run(input): ToolResult {
    const value = assertInput(input, 'Request URL');
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new ToolError('Use an absolute URL beginning with http:// or https://.');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new ToolError('Only http and https requests are supported.');
    }
    return {
      output: `GET ${url.toString()}`,
      meta: [{ label: 'Host', value: url.host }],
    };
  },
  docs: {
    about:
      'Uses the browser fetch API. CORS is enforced by the browser; the app cannot and does not bypass it.',
    limitations: [
      'Targets must allow cross-origin requests from this page. APIs without CORS headers will fail in the browser even when they work from a terminal.',
      'Authorization and other sensitive headers are kept in memory; saved history redacts their values.',
      'Responses larger than 200 KB are truncated in the viewer.',
    ],
  },
};
