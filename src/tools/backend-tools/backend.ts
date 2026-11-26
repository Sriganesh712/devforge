import {
  assertInput,
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';
import { parseHeaderLines, redactHeaders } from '@/packages/core/http';

interface StatusEntry {
  code: number;
  name: string;
  description: string;
  cls: string;
}

const STATUSES: StatusEntry[] = [
  { code: 100, name: 'Continue', cls: '1xx', description: 'The server received the headers and the client should send the body.' },
  { code: 101, name: 'Switching Protocols', cls: '1xx', description: 'The server is switching protocols as requested by Upgrade.' },
  { code: 102, name: 'Processing', cls: '1xx', description: 'WebDAV: the server is processing the request but has no response yet.' },
  { code: 103, name: 'Early Hints', cls: '1xx', description: 'Preload hints sent before the final response.' },
  { code: 200, name: 'OK', cls: '2xx', description: 'The request succeeded.' },
  { code: 201, name: 'Created', cls: '2xx', description: 'A resource was created; the Location header often points to it.' },
  { code: 202, name: 'Accepted', cls: '2xx', description: 'The request was accepted for asynchronous processing.' },
  { code: 203, name: 'Non-Authoritative Information', cls: '2xx', description: 'The response was transformed by a proxy.' },
  { code: 204, name: 'No Content', cls: '2xx', description: 'Success with no response body; often used for DELETE.' },
  { code: 205, name: 'Reset Content', cls: '2xx', description: 'The client should reset the document view.' },
  { code: 206, name: 'Partial Content', cls: '2xx', description: 'A range request succeeded; the body is a byte range.' },
  { code: 207, name: 'Multi-Status', cls: '2xx', description: 'WebDAV: multiple independent statuses are returned.' },
  { code: 208, name: 'Already Reported', cls: '2xx', description: 'WebDAV: members were already reported in a previous response.' },
  { code: 226, name: 'IM Used', cls: '2xx', description: 'The response is a delta encoding of the resource.' },
  { code: 300, name: 'Multiple Choices', cls: '3xx', description: 'Several representations are available; the client chooses.' },
  { code: 301, name: 'Moved Permanently', cls: '3xx', description: 'The resource moved permanently; update links and bookmarks.' },
  { code: 302, name: 'Found', cls: '3xx', description: 'Temporary redirect. Historically clients changed POST to GET.' },
  { code: 303, name: 'See Other', cls: '3xx', description: 'Fetch the result at another URL with GET.' },
  { code: 304, name: 'Not Modified', cls: '3xx', description: 'The cached representation is still valid.' },
  { code: 307, name: 'Temporary Redirect', cls: '3xx', description: 'Temporary redirect that preserves the request method and body.' },
  { code: 308, name: 'Permanent Redirect', cls: '3xx', description: 'Permanent redirect that preserves the request method and body.' },
  { code: 400, name: 'Bad Request', cls: '4xx', description: 'The server cannot process the request, often due to malformed input.' },
  { code: 401, name: 'Unauthorized', cls: '4xx', description: 'Authentication is missing or invalid. It is not the same as 403.' },
  { code: 402, name: 'Payment Required', cls: '4xx', description: 'Reserved for payment-related access; rarely implemented.' },
  { code: 403, name: 'Forbidden', cls: '4xx', description: 'The server understood the request but refuses to authorize it.' },
  { code: 404, name: 'Not Found', cls: '4xx', description: 'No resource matches the request target.' },
  { code: 405, name: 'Method Not Allowed', cls: '4xx', description: 'The method is not supported for this resource; check Allow.' },
  { code: 406, name: 'Not Acceptable', cls: '4xx', description: 'No representation satisfies the Accept headers.' },
  { code: 407, name: 'Proxy Authentication Required', cls: '4xx', description: 'The client must authenticate with the proxy.' },
  { code: 408, name: 'Request Timeout', cls: '4xx', description: 'The server timed out waiting for the request.' },
  { code: 409, name: 'Conflict', cls: '4xx', description: 'The request conflicts with the current resource state.' },
  { code: 410, name: 'Gone', cls: '4xx', description: 'The resource is permanently gone and no forwarding address is known.' },
  { code: 411, name: 'Length Required', cls: '4xx', description: 'The request needs a Content-Length header.' },
  { code: 412, name: 'Precondition Failed', cls: '4xx', description: 'A conditional request header evaluated to false.' },
  { code: 413, name: 'Content Too Large', cls: '4xx', description: 'The request body exceeds the server limit.' },
  { code: 414, name: 'URI Too Long', cls: '4xx', description: 'The request target is longer than the server accepts.' },
  { code: 415, name: 'Unsupported Media Type', cls: '4xx', description: 'The body format is not supported for this method.' },
  { code: 416, name: 'Range Not Satisfiable', cls: '4xx', description: 'The requested byte range cannot be served.' },
  { code: 417, name: 'Expectation Failed', cls: '4xx', description: 'The Expect header cannot be met.' },
  { code: 418, name: 'I’m a Teapot', cls: '4xx', description: 'An April Fools’ RFC, sometimes used as a deliberate joke.' },
  { code: 421, name: 'Misdirected Request', cls: '4xx', description: 'The request reached a server that cannot produce a response.' },
  { code: 422, name: 'Unprocessable Content', cls: '4xx', description: 'The syntax is valid but the content is semantically invalid.' },
  { code: 423, name: 'Locked', cls: '4xx', description: 'WebDAV: the resource is locked.' },
  { code: 424, name: 'Failed Dependency', cls: '4xx', description: 'WebDAV: a dependent action failed.' },
  { code: 425, name: 'Too Early', cls: '4xx', description: 'The server refuses to risk replaying the request.' },
  { code: 426, name: 'Upgrade Required', cls: '4xx', description: 'The client must switch protocols, often to TLS.' },
  { code: 428, name: 'Precondition Required', cls: '4xx', description: 'The server requires a conditional request.' },
  { code: 429, name: 'Too Many Requests', cls: '4xx', description: 'Rate limit exceeded; check Retry-After.' },
  { code: 431, name: 'Request Header Fields Too Large', cls: '4xx', description: 'The header section exceeds server limits.' },
  { code: 451, name: 'Unavailable For Legal Reasons', cls: '4xx', description: 'The resource is blocked for legal reasons.' },
  { code: 500, name: 'Internal Server Error', cls: '5xx', description: 'An unexpected server error occurred.' },
  { code: 501, name: 'Not Implemented', cls: '5xx', description: 'The server does not support the requested functionality.' },
  { code: 502, name: 'Bad Gateway', cls: '5xx', description: 'An upstream server returned an invalid response.' },
  { code: 503, name: 'Service Unavailable', cls: '5xx', description: 'The server is overloaded or under maintenance; try later.' },
  { code: 504, name: 'Gateway Timeout', cls: '5xx', description: 'An upstream server did not respond in time.' },
  { code: 505, name: 'HTTP Version Not Supported', cls: '5xx', description: 'The HTTP version is not supported by the server.' },
  { code: 506, name: 'Variant Also Negotiates', cls: '5xx', description: 'Content negotiation is misconfigured.' },
  { code: 507, name: 'Insufficient Storage', cls: '5xx', description: 'WebDAV: the server cannot store the representation.' },
  { code: 508, name: 'Loop Detected', cls: '5xx', description: 'WebDAV: an infinite loop was detected.' },
  { code: 510, name: 'Not Extended', cls: '5xx', description: 'Further extensions to the request are required.' },
  { code: 511, name: 'Network Authentication Required', cls: '5xx', description: 'The client needs to authenticate to gain network access.' },
];

export const httpStatusExplorer: ToolDefinition = {
  id: 'http-status-explorer',
  name: 'HTTP status explorer',
  summary: 'Look up status codes by number, name or meaning, with correct 401 vs 403 guidance.',
  category: 'backend',
  version: '1.0.0',
  tags: ['http', 'status', 'rest', 'api'],
  aliases: ['status codes', 'http 404'],
  privacy: { locality: 'local', note: 'A local reference table; no network requests.' },
  input: {
    label: 'Filter',
    sample: '404',
    placeholder: 'code, name or keyword',
    rows: 2,
  },
  options: [
    {
      kind: 'select',
      id: 'class',
      label: 'Class',
      defaultValue: 'all',
      choices: [
        { value: 'all', label: 'All' },
        { value: '2xx', label: '2xx success' },
        { value: '3xx', label: '3xx redirect' },
        { value: '4xx', label: '4xx client' },
        { value: '5xx', label: '5xx server' },
      ],
    },
  ],
  run(input, options): ToolResult {
    const query = input.trim().toLowerCase();
    const cls = optionString(options, 'class', 'all');
    const matches = STATUSES.filter((entry) => {
      if (cls !== 'all' && entry.cls !== cls) return false;
      if (!query) return true;
      return (
        String(entry.code).includes(query) ||
        entry.name.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query)
      );
    });
    if (matches.length === 0) throw new ToolError('No status code matches that filter.');
    return {
      output: matches
        .map((entry) => `${entry.code} ${entry.name}\n  ${entry.description}`)
        .join('\n\n'),
      meta: [
        { label: 'Matches', value: String(matches.length) },
        { label: 'Reference size', value: String(STATUSES.length) },
      ],
    };
  },
  docs: {
    about:
      'A curated reference of the status codes backend developers meet most, including 401 vs 403 and 301 vs 308.',
    limitations: [
      'It is a reference, not a full IANA registry; uncommon WebDAV codes may be missing.',
      'A status code alone does not describe an API’s error body contract.',
    ],
  },
};

const MIME_TYPES: Array<{ type: string; ext: string; description: string }> = [
  { type: 'application/json', ext: '.json', description: 'JSON data' },
  { type: 'application/ld+json', ext: '.jsonld', description: 'JSON-LD linked data' },
  { type: 'application/xml', ext: '.xml', description: 'XML data' },
  { type: 'application/xhtml+xml', ext: '.xhtml', description: 'XHTML document' },
  { type: 'application/javascript', ext: '.js', description: 'JavaScript source' },
  { type: 'application/pdf', ext: '.pdf', description: 'PDF document' },
  { type: 'application/zip', ext: '.zip', description: 'ZIP archive' },
  { type: 'application/gzip', ext: '.gz', description: 'Gzip archive' },
  { type: 'application/wasm', ext: '.wasm', description: 'WebAssembly module' },
  { type: 'application/octet-stream', ext: '.bin', description: 'Arbitrary binary data' },
  { type: 'application/vnd.api+json', ext: '.json', description: 'JSON:API document' },
  { type: 'application/problem+json', ext: '.json', description: 'RFC 9457 problem details' },
  { type: 'application/x-www-form-urlencoded', ext: '', description: 'HTML form submission' },
  { type: 'application/graphql', ext: '.graphql', description: 'GraphQL query document' },
  { type: 'application/yaml', ext: '.yaml', description: 'YAML data (not IANA-registered)' },
  { type: 'application/sql', ext: '.sql', description: 'SQL source' },
  { type: 'application/toml', ext: '.toml', description: 'TOML configuration' },
  { type: 'audio/mpeg', ext: '.mp3', description: 'MP3 audio' },
  { type: 'audio/ogg', ext: '.ogg', description: 'Ogg audio' },
  { type: 'audio/wav', ext: '.wav', description: 'WAV audio' },
  { type: 'audio/webm', ext: '.weba', description: 'WebM audio' },
  { type: 'font/woff', ext: '.woff', description: 'WOFF font' },
  { type: 'font/woff2', ext: '.woff2', description: 'WOFF2 font' },
  { type: 'font/ttf', ext: '.ttf', description: 'TrueType font' },
  { type: 'font/otf', ext: '.otf', description: 'OpenType font' },
  { type: 'image/avif', ext: '.avif', description: 'AVIF image' },
  { type: 'image/gif', ext: '.gif', description: 'GIF image' },
  { type: 'image/jpeg', ext: '.jpg', description: 'JPEG image' },
  { type: 'image/png', ext: '.png', description: 'PNG image' },
  { type: 'image/svg+xml', ext: '.svg', description: 'SVG image' },
  { type: 'image/webp', ext: '.webp', description: 'WebP image' },
  { type: 'image/x-icon', ext: '.ico', description: 'Icon image' },
  { type: 'multipart/form-data', ext: '', description: 'Multipart form or file upload' },
  { type: 'text/css', ext: '.css', description: 'CSS stylesheet' },
  { type: 'text/csv', ext: '.csv', description: 'Comma-separated values' },
  { type: 'text/html', ext: '.html', description: 'HTML document' },
  { type: 'text/markdown', ext: '.md', description: 'Markdown document' },
  { type: 'text/plain', ext: '.txt', description: 'Plain text' },
  { type: 'text/tab-separated-values', ext: '.tsv', description: 'Tab-separated values' },
  { type: 'text/yaml', ext: '.yaml', description: 'YAML text (alternate registration)' },
  { type: 'video/mp4', ext: '.mp4', description: 'MP4 video' },
  { type: 'video/ogg', ext: '.ogv', description: 'Ogg video' },
  { type: 'video/webm', ext: '.webm', description: 'WebM video' },
  { type: 'video/quicktime', ext: '.mov', description: 'QuickTime video' },
];

export const mimeLookup: ToolDefinition = {
  id: 'mime-type-lookup',
  name: 'MIME type lookup',
  summary: 'Find the content type for a file extension, or the extensions for a MIME type.',
  category: 'backend',
  version: '1.0.0',
  tags: ['mime', 'content-type', 'http', 'files'],
  aliases: ['content type', 'mime type'],
  privacy: { locality: 'local', note: 'A local reference table.' },
  input: {
    label: 'Search',
    sample: 'json',
    placeholder: 'extension or MIME type',
    rows: 2,
  },
  run(input): ToolResult {
    const query = input.trim().toLowerCase().replace(/^\./, '');
    if (!query) throw new ToolError('Type an extension or MIME type, for example json or image/png.');
    const matches = MIME_TYPES.filter(
      (entry) =>
        entry.type.toLowerCase().includes(query) ||
        entry.ext.replace('.', '').toLowerCase() === query ||
        entry.description.toLowerCase().includes(query),
    );
    if (matches.length === 0) throw new ToolError('No MIME type matches that search.');
    return {
      output: matches
        .map(
          (entry) =>
            `${entry.type}${entry.ext ? `  ${entry.ext}` : ''}\n  ${entry.description}`,
        )
        .join('\n\n'),
      meta: [
        { label: 'Matches', value: String(matches.length) },
        { label: 'Reference size', value: String(MIME_TYPES.length) },
      ],
    };
  },
  docs: {
    about: 'A curated lookup table of common web, code, image, audio and archive content types.',
    limitations: [
      'A subset of the IANA registry; vendor-specific and uncommon types may be absent.',
      'Browsers and servers may use different defaults; always set Content-Type explicitly.',
    ],
  },
};

const SECRET_QUERY = /token|key|secret|password|auth|signature/i;

export const urlParser: ToolDefinition = {
  id: 'url-parser',
  name: 'URL parser',
  summary: 'Break a URL into origin, path, query parameters and fragment, with secret values redacted.',
  category: 'backend',
  version: '1.0.0',
  tags: ['url', 'query', 'parse', 'http'],
  aliases: ['parse url', 'query string parser'],
  privacy: { locality: 'local', note: 'Parsed in your browser.' },
  input: {
    label: 'URL',
    sample: 'https://api.example.dev:8443/v1/tasks?status=open&limit=20&token=demo-secret#results',
    rows: 3,
  },
  run(input): ToolResult {
    const source = assertInput(input, 'URL').trim();
    let url: URL;
    try {
      url = new URL(source);
    } catch {
      throw new ToolError('That is not a valid absolute URL.');
    }
    const params = [...url.searchParams.entries()];
    const warnings: string[] = [];
    if (url.username || url.password) warnings.push('Credentials are embedded in the URL. Browsers and logs may expose them.');
    if (url.protocol === 'http:') warnings.push('This URL uses plain HTTP. Use HTTPS for anything sensitive.');
    if (params.some(([key]) => SECRET_QUERY.test(key))) {
      warnings.push('Secret-looking query parameters were redacted in the output.');
    }
    const lines = [
      `Scheme: ${url.protocol.replace(':', '')}`,
      `Origin: ${url.origin}`,
      `Host: ${url.hostname}`,
      `Port: ${url.port || '(default)'}`,
      `Path: ${url.pathname}`,
      `Fragment: ${url.hash || '(none)'}`,
      `Username: ${url.username ? url.username : '(none)'}`,
      `Password: ${url.password ? '(present, redacted)' : '(none)'}`,
      '',
      `Query parameters (${params.length})`,
      ...(params.length > 0
        ? params.map(
            ([key, value]) =>
              `  ${key}: ${SECRET_QUERY.test(key) ? '[redacted]' : value}`,
          )
        : ['  none']),
      '',
      'Decoded query string',
      params.length > 0
        ? new URLSearchParams(
            params.map(([key, value]) => [key, SECRET_QUERY.test(key) ? '[redacted]' : value]),
          ).toString()
        : '(empty)',
    ];
    return {
      output: lines.join('\n'),
      meta: [
        { label: 'Host', value: url.host },
        { label: 'Parameters', value: String(params.length) },
      ],
      warnings,
    };
  },
  docs: {
    about:
      'Uses the WHATWG URL parser, which normalizes the host, path and percent-encoding the same way browsers do.',
    limitations: [
      'Secret-looking query values are redacted from the report; the tool does not fetch the URL.',
      'Internationalized hostnames are shown in their ASCII (punycode) form.',
    ],
  },
};

export const headerInspector: ToolDefinition = {
  id: 'header-inspector',
  name: 'Request header inspector',
  summary: 'Normalize raw request headers and flag malformed, duplicate and sensitive entries.',
  category: 'backend',
  version: '1.0.0',
  tags: ['headers', 'http', 'request', 'debug'],
  aliases: ['header parser', 'request headers'],
  privacy: { locality: 'local', note: 'Headers are parsed locally and sensitive values are redacted.' },
  input: {
    label: 'Raw headers',
    sample: `Accept: application/json
Content-Type: application/json
Authorization: Bearer demo-token
X-Request-Id: 7f3c2a
X-Request-Id: 7f3c2b
Cookie: session=abc123
BadHeaderWithoutColon
X-Trace: ${'a'.repeat(180)}`,
    rows: 10,
  },
  run(input): ToolResult {
    const parsed = parseHeaderLines(assertInput(input, 'Headers'));
    if (parsed.headers.length === 0 && parsed.errors.length === 0) {
      throw new ToolError('No headers found.');
    }
    const counts = new Map<string, number>();
    for (const header of parsed.headers) {
      const key = header.name.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const duplicates = [...counts.entries()].filter(([, count]) => count > 1);
    const sensitive = parsed.headers.filter((header) =>
      /authorization|cookie|token|secret|api[-_]?key/i.test(header.name),
    );
    const redacted = redactHeaders(parsed.headers);
    const lines = [
      `Headers: ${parsed.headers.length}`,
      `Unique names: ${counts.size}`,
      `Malformed lines: ${parsed.errors.length}`,
      `Sensitive headers: ${sensitive.length}`,
      '',
      'Normalized headers',
      ...redacted.map((header) => `${header.name}: ${header.value}`),
      '',
      'Duplicate names',
      ...(duplicates.length > 0 ? duplicates.map(([name, count]) => `  ${name} × ${count}`) : ['  none']),
      '',
      'Malformed lines',
      ...(parsed.errors.length > 0 ? parsed.errors.map((error) => `  ${error}`) : ['  none']),
      '',
      'Sensitive values are redacted in this report.',
    ];
    return {
      output: lines.join('\n'),
      meta: [
        { label: 'Headers', value: String(parsed.headers.length) },
        { label: 'Malformed', value: String(parsed.errors.length) },
      ],
      warnings: [
        ...(duplicates.length > 0 ? ['Duplicate header names can change behavior; confirm which value the server uses.'] : []),
        ...(sensitive.length > 0 ? ['Sensitive headers were redacted. Do not paste production credentials into shared screens.'] : []),
      ],
    };
  },
  docs: {
    about:
      'Parses "Name: value" lines, validates header names and reports duplicates and sensitive entries without echoing their values.',
    limitations: [
      'It does not validate values against each header’s grammar.',
      'Header semantics differ by server and proxy; this is a syntax check, not a request simulation.',
    ],
  },
};
