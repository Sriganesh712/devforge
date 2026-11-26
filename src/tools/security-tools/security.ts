import {
  assertInput,
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

function base64UrlDecode(part: string): string {
  const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  } catch {
    throw new ToolError('A token segment is not valid base64url.');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new ToolError('A token segment is not valid UTF-8 JSON.');
  }
}

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  headerRaw: string;
  payloadRaw: string;
}

export function decodeJwt(token: string): DecodedJwt {
  const parts = token.trim().split('.');
  if (parts.length === 3) {
    // standard signed token
  } else if (parts.length === 5) {
    throw new ToolError('This looks like an encrypted JWE (5 segments). Only signed JWT/JWS tokens are decoded.');
  } else {
    throw new ToolError('A JWT needs three dot-separated segments: header.payload.signature.');
  }
  const headerRaw = base64UrlDecode(parts[0]);
  const payloadRaw = base64UrlDecode(parts[1]);
  let header: Record<string, unknown>;
  let payload: Record<string, unknown>;
  try {
    header = JSON.parse(headerRaw) as Record<string, unknown>;
    payload = JSON.parse(payloadRaw) as Record<string, unknown>;
  } catch {
    throw new ToolError('The header or payload is not a JSON object.');
  }
  return { header, payload, signature: parts[2], headerRaw, payloadRaw };
}

function timeClaim(value: unknown): string {
  if (typeof value !== 'number') return String(value ?? '');
  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${date.toISOString()} (${date.toLocaleString()})`;
}

export function jwtSummary(decoded: DecodedJwt): { lines: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const now = Math.floor(Date.now() / 1000);
  const alg = String(decoded.header.alg ?? 'none');
  if (alg === 'none') warnings.push('This token is unsigned (alg=none). Anyone can change its claims.');
  if (decoded.signature === '') warnings.push('The signature segment is empty.');
  const exp = decoded.payload.exp;
  if (typeof exp === 'number') {
    if (exp < now) warnings.push(`Token expired ${new Date(exp * 1000).toISOString()}.`);
  } else {
    warnings.push('No exp claim: the token has no built-in expiry.');
  }
  if (typeof decoded.payload.nbf === 'number' && decoded.payload.nbf > now) {
    warnings.push('The nbf claim is in the future; the token is not valid yet.');
  }
  const lines = [
    `Algorithm: ${alg}`,
    `Type: ${String(decoded.header.typ ?? '(not set)')}`,
    `Signature: ${decoded.signature ? 'present — not verified' : 'missing'}`,
    '',
    'Header',
    JSON.stringify(decoded.header, null, 2),
    '',
    'Payload',
    JSON.stringify(decoded.payload, null, 2),
    '',
    'Registered claims',
    ...['iss', 'sub', 'aud', 'exp', 'nbf', 'iat', 'jti'].map((claim) =>
      decoded.payload[claim] === undefined
        ? `  ${claim}: (not set)`
        : `  ${claim}: ${['exp', 'nbf', 'iat'].includes(claim) ? timeClaim(decoded.payload[claim]) : String(decoded.payload[claim])}`,
    ),
  ];
  return { lines, warnings };
}

export async function verifyHmacJwt(
  token: string,
  secret: string,
): Promise<{ valid: boolean; algorithm: string; message: string }> {
  const decoded = decodeJwt(token);
  const alg = String(decoded.header.alg ?? '');
  if (!/^HS(256|384|512)$/.test(alg)) {
    return {
      valid: false,
      algorithm: alg || 'none',
      message: `Only HMAC HS256, HS384 and HS512 can be verified here. ${alg || 'This token'} needs its issuer's public key or JWKS, which this tool does not fetch.`,
    };
  }
  if (!secret) throw new ToolError('Enter the HMAC secret used to sign the token.');
  const parts = token.trim().split('.');
  let signature: Uint8Array;
  try {
    const normalized = parts[2].replace(/-/g, '+').replace(/_/g, '/');
    signature = Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')), (char) =>
      char.charCodeAt(0),
    );
  } catch {
    return { valid: false, algorithm: alg, message: 'The signature segment is not valid base64url.' };
  }
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new ToolError('Web Crypto is unavailable. Use a secure context (https or localhost).');
  }
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: `SHA-${alg.slice(2)}` },
    false,
    ['verify'],
  );
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    signature as unknown as BufferSource,
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
  );
  return {
    valid,
    algorithm: alg,
    message: valid
      ? 'Signature matches the supplied secret.'
      : 'Signature does not match the supplied secret. The token may be altered, or the secret may be wrong.',
  };
}

export const jwtDecoder: ToolDefinition = {
  id: 'jwt-decoder',
  name: 'JWT decoder',
  summary: 'Decode a JWT, read its claims and optionally verify an HMAC signature.',
  category: 'security',
  version: '1.0.0',
  tags: ['jwt', 'token', 'decode', 'hmac', 'security'],
  aliases: ['json web token', 'jwt inspector'],
  privacy: {
    locality: 'local',
    note: 'Decoding and HMAC verification happen in your browser. The token is never uploaded.',
  },
  ui: 'jwt',
  featured: true,
  input: {
    label: 'JWT',
    sample:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkYSBMb3ZlbGFjZSIsImlzcyI6ImRldmZvcmdlLWRlbW8iLCJpYXQiOjE3MzI1MDAwMDAsImV4cCI6NDA3MDkwODgwMH0.5vF3n2k9pQ1s7r4m8c6t2w0y3x5z7b9d1e4f6g8h0i2',
    rows: 5,
  },
  run(input): ToolResult {
    const decoded = decodeJwt(assertInput(input, 'JWT'));
    const { lines, warnings } = jwtSummary(decoded);
    return {
      output: lines.join('\n'),
      meta: [
        { label: 'Algorithm', value: String(decoded.header.alg ?? 'none') },
        { label: 'Signature', value: decoded.signature ? 'present (unverified)' : 'missing' },
      ],
      warnings,
    };
  },
  docs: {
    about:
      'Decodes the base64url header and payload. HMAC verification is an explicit second step with a secret you supply; decoding alone never proves authenticity.',
    limitations: [
      'RS256, ES256 and other asymmetric signatures are not verified; that needs the issuer’s public key or JWKS.',
      'The tool does not check issuer, audience or revocation; your application must do that.',
      'Never paste a production token into a shared screen or recording.',
    ],
  },
};

const COMMON_PASSWORDS = new Set([
  'password',
  '123456',
  '123456789',
  'qwerty',
  'abc123',
  'letmein',
  'monkey',
  'dragon',
  '111111',
  'baseball',
  'iloveyou',
  'trustno1',
  'sunshine',
  'master',
  'welcome',
  'shadow',
  'ashley',
  'football',
  'jesus',
  'michael',
  'ninja',
  'mustang',
  'password1',
  'admin',
  'login',
  'passw0rd',
  'starwars',
  'hello',
  'freedom',
  'whatever',
  'qwerty123',
  '1q2w3e4r',
  'zaq12wsx',
  'changeme',
  'secret',
  'devforge',
  'letmein123',
  'welcome1',
  'p@ssw0rd',
  'root',
  'toor',
  'guest',
  'test',
  'test123',
  'admin123',
]);

export interface PasswordEstimate {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  entropy: number;
  crackTime: string;
  advice: string[];
}

function humanDuration(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'effectively forever';
  if (seconds < 1) return 'less than a second';
  const units: Array<[string, number]> = [
    ['century', 60 * 60 * 24 * 365 * 100],
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
    ['second', 1],
  ];
  for (const [unit, size] of units) {
    if (seconds >= size) {
      const value = seconds / size;
      return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${unit}${Math.round(value) === 1 ? '' : 's'}`;
    }
  }
  return 'less than a second';
}

export function estimatePassword(password: string): PasswordEstimate {
  const advice: string[] = [];
  if (!password) {
    return {
      score: 0,
      label: 'Empty',
      entropy: 0,
      crackTime: 'instant',
      advice: ['Enter a password to estimate its strength.'],
    };
  }
  let charset = 0;
  if (/[a-z]/.test(password)) charset += 26;
  if (/[A-Z]/.test(password)) charset += 26;
  if (/[0-9]/.test(password)) charset += 10;
  if (/[^A-Za-z0-9]/.test(password)) charset += 33;
  let entropy = password.length * Math.log2(Math.max(charset, 1));
  const lower = password.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) {
    entropy = Math.min(entropy, 8);
    advice.push('This is a well-known password. Choose something unique.');
  }
  if (/(.)\1{2,}/.test(password)) {
    entropy *= 0.75;
    advice.push('Avoid long runs of the same character.');
  }
  if (/abcdef|123456|qwerty|asdfgh|zxcvbn/i.test(password)) {
    entropy *= 0.75;
    advice.push('Sequences and keyboard walks are easy to guess.');
  }
  if (password.length < 12) advice.push('Use at least 12 characters; a passphrase of 4+ words is easier to remember.');
  if (charset < 52) advice.push('Mix character types, or use a longer passphrase instead of substitutions.');
  if (/^(19|20)\d{2}$/.test(password)) advice.push('A year alone is not a strong password.');
  if (advice.length === 0) advice.push('Use a password manager and a unique password per site.');
  const score: PasswordEstimate['score'] =
    entropy < 28 ? 0 : entropy < 36 ? 1 : entropy < 60 ? 2 : entropy < 80 ? 3 : 4;
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const seconds = Math.pow(2, entropy) / 1e10;
  return {
    score,
    label: labels[score],
    entropy: Math.round(entropy * 10) / 10,
    crackTime: humanDuration(seconds),
    advice,
  };
}

export const passwordStrength: ToolDefinition = {
  id: 'password-strength',
  name: 'Password strength estimator',
  summary: 'Estimate password entropy and guess time with pattern penalties and practical advice.',
  category: 'security',
  version: '1.0.0',
  tags: ['password', 'strength', 'entropy', 'security'],
  aliases: ['password checker', 'password meter'],
  privacy: {
    locality: 'local',
    note: 'The password stays in your browser and is never stored or sent.',
  },
  ui: 'password',
  input: {
    label: 'Password',
    sample: 'correct horse battery staple',
    rows: 2,
  },
  run(input): ToolResult {
    const password = assertInput(input, 'Password');
    const estimate = estimatePassword(password);
    return {
      output: [
        `Rating: ${estimate.label} (${estimate.score}/4)`,
        `Estimated entropy: ${estimate.entropy} bits`,
        `Offline guess time at 10 billion guesses/second: ${estimate.crackTime}`,
        '',
        'Advice',
        ...estimate.advice.map((item) => `- ${item}`),
        '',
        'This is a heuristic estimate, not a guarantee. Real attackers use leaked password lists and targeted guesses.',
      ].join('\n'),
      meta: [
        { label: 'Score', value: `${estimate.score}/4` },
        { label: 'Entropy', value: `${estimate.entropy} bits` },
      ],
    };
  },
  docs: {
    about:
      'Estimates entropy from length and character classes, then applies penalties for common passwords, repeats and sequences.',
    limitations: [
      'Entropy is an estimate; it cannot know whether a password appears in a breach corpus.',
      'The crack-time figure assumes a fixed offline guessing rate and is illustrative only.',
      'Never type a real production password into any web page, including this one.',
    ],
  },
};

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) throw new ToolError('Invalid random range.');
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  const buffer = new Uint32Array(1);
  do {
    crypto.getRandomValues(buffer);
  } while (buffer[0] >= limit);
  return buffer[0] % maxExclusive;
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function password(length: number, symbols: boolean): string {
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const special = symbols ? '!@#$%^&*()-_=+[]{};:,.?' : '';
  const all = lower + upper + digits + special;
  const required = [lower, upper, digits, ...(symbols ? [special] : [])];
  const characters = required.map((set) => set[randomInt(set.length)]);
  while (characters.length < length) characters.push(all[randomInt(all.length)]);
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [characters[index], characters[swap]] = [characters[swap], characters[index]];
  }
  return characters.join('');
}

export const secureRandom: ToolDefinition = {
  id: 'secure-random',
  name: 'Secure random generator',
  summary: 'Generate hex, base64, passwords or UUIDs from the browser crypto source.',
  category: 'security',
  version: '1.0.0',
  tags: ['random', 'password', 'hex', 'base64', 'uuid', 'security'],
  aliases: ['random string', 'password generator', 'secure random'],
  privacy: { locality: 'local', note: 'Values are generated locally with crypto.getRandomValues.' },
  input: {
    label: 'Purpose (not used)',
    sample: 'Generating a local development API secret.',
    rows: 2,
  },
  options: [
    {
      kind: 'select',
      id: 'kind',
      label: 'Output',
      defaultValue: 'password',
      choices: [
        { value: 'password', label: 'Password' },
        { value: 'hex', label: 'Hex bytes' },
        { value: 'base64', label: 'Base64 bytes' },
        { value: 'uuid', label: 'UUID v4' },
      ],
    },
    { kind: 'number', id: 'size', label: 'Length / byte count', defaultValue: 24, min: 4, max: 256 },
    { kind: 'number', id: 'count', label: 'How many', defaultValue: 3, min: 1, max: 20 },
    { kind: 'toggle', id: 'symbols', label: 'Password symbols', defaultValue: true },
  ],
  run(_input, options): ToolResult {
    const kind = optionString(options, 'kind', 'password');
    const size = Math.round(Number(options.size ?? 24));
    const count = Math.round(Number(options.count ?? 3));
    if (!Number.isFinite(size) || size < 4 || size > 256) {
      throw new ToolError('Length must be between 4 and 256.');
    }
    if (!Number.isFinite(count) || count < 1 || count > 20) {
      throw new ToolError('Count must be between 1 and 20.');
    }
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      throw new ToolError('This browser does not expose crypto.getRandomValues.');
    }
    const values = Array.from({ length: count }, () => {
      if (kind === 'hex') return toHex(randomBytes(size));
      if (kind === 'base64') return toBase64(randomBytes(size));
      if (kind === 'uuid') {
        const bytes = randomBytes(16);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = toHex(bytes);
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      }
      return password(Math.max(8, Math.min(size, 128)), options.symbols !== false);
    });
    return {
      output: values.join('\n'),
      meta: [
        { label: 'Kind', value: kind },
        { label: 'Count', value: String(values.length) },
      ],
    };
  },
  docs: {
    about:
      'Uses crypto.getRandomValues with rejection sampling for password characters. Passwords avoid ambiguous I, l, 1, O and 0.',
    limitations: [
      'A random string is only one part of secret management; store it in a secret manager, not in source control.',
      'Base64 and hex output are encoded random bytes, not encryption.',
    ],
  },
};

export interface HeaderCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail' | 'info';
  detail: string;
}

export interface HeaderAudit {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  score: number;
  checks: HeaderCheck[];
  warnings: string[];
}

export function analyzeSecurityHeaders(source: string): HeaderAudit {
  const body = source.split(/\r?\n\r?\n/)[0];
  const lines = body.split(/\r?\n/).filter((line) => line.trim() && !/^HTTP\/\d/i.test(line));
  const map = new Map<string, string[]>();
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon <= 0) continue;
    const name = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();
    map.set(name, [...(map.get(name) ?? []), value]);
  }
  if (map.size === 0) throw new ToolError('No headers found. Paste raw response headers, one "Name: value" per line.');
  const get = (name: string) => map.get(name)?.join(', ') ?? '';
  const checks: HeaderCheck[] = [];
  const warnings: string[] = [];

  const csp = get('content-security-policy');
  if (!csp) {
    checks.push({ name: 'Content-Security-Policy', status: 'fail', detail: 'Missing. Add a policy that restricts scripts, styles and frames.' });
  } else if (/unsafe-inline|unsafe-eval/i.test(csp)) {
    checks.push({ name: 'Content-Security-Policy', status: 'warn', detail: 'Present, but allows unsafe-inline or unsafe-eval. Tighten it where possible.' });
  } else if (!/default-src|script-src/i.test(csp)) {
    checks.push({ name: 'Content-Security-Policy', status: 'warn', detail: 'Present, but no default-src or script-src directive was found.' });
  } else {
    checks.push({ name: 'Content-Security-Policy', status: 'pass', detail: 'Present with script restrictions.' });
  }

  const hsts = get('strict-transport-security');
  if (!hsts) {
    checks.push({ name: 'Strict-Transport-Security', status: 'fail', detail: 'Missing. HTTPS sites should set max-age and includeSubDomains.' });
  } else {
    const maxAge = Number(/max-age=(\d+)/i.exec(hsts)?.[1] ?? 0);
    if (maxAge < 15552000) {
      checks.push({ name: 'Strict-Transport-Security', status: 'warn', detail: `max-age is ${maxAge}; six months (15552000) or more is typical.` });
    } else {
      checks.push({ name: 'Strict-Transport-Security', status: 'pass', detail: `max-age=${maxAge}${/includeSubDomains/i.test(hsts) ? ', includeSubDomains' : ''}.` });
    }
  }

  const nosniff = get('x-content-type-options').toLowerCase();
  checks.push(
    nosniff === 'nosniff'
      ? { name: 'X-Content-Type-Options', status: 'pass', detail: 'nosniff is set.' }
      : { name: 'X-Content-Type-Options', status: 'fail', detail: 'Set to nosniff to stop MIME sniffing.' },
  );

  const frame = get('x-frame-options');
  const frameAncestors = /frame-ancestors/i.test(csp);
  if (frameAncestors || /^(deny|sameorigin)/i.test(frame)) {
    checks.push({ name: 'Frame protection', status: 'pass', detail: frameAncestors ? 'CSP frame-ancestors is present.' : `X-Frame-Options is ${frame}.` });
  } else {
    checks.push({ name: 'Frame protection', status: 'fail', detail: 'Set X-Frame-Options DENY/SAMEORIGIN or CSP frame-ancestors.' });
  }

  const referrer = get('referrer-policy');
  if (!referrer) {
    checks.push({ name: 'Referrer-Policy', status: 'warn', detail: 'Missing. strict-origin-when-cross-origin is a safe default.' });
  } else if (/unsafe-url/i.test(referrer)) {
    checks.push({ name: 'Referrer-Policy', status: 'fail', detail: 'unsafe-url leaks full paths to other origins.' });
  } else {
    checks.push({ name: 'Referrer-Policy', status: 'pass', detail: referrer });
  }

  const permissions = get('permissions-policy');
  checks.push(
    permissions
      ? { name: 'Permissions-Policy', status: 'pass', detail: 'Present.' }
      : { name: 'Permissions-Policy', status: 'warn', detail: 'Missing. Disable camera, microphone and geolocation you do not use.' },
  );

  const coop = get('cross-origin-opener-policy');
  checks.push(
    coop
      ? { name: 'Cross-Origin-Opener-Policy', status: 'pass', detail: coop }
      : { name: 'Cross-Origin-Opener-Policy', status: 'info', detail: 'Not set. Consider same-origin for isolation.' },
  );

  if (get('server')) {
    checks.push({ name: 'Server header', status: 'warn', detail: `Reveals "${get('server')}". Consider removing version details.` });
  }
  if (get('x-powered-by')) {
    checks.push({ name: 'X-Powered-By', status: 'warn', detail: `Reveals "${get('x-powered-by')}". Remove it.` });
  }

  const cookies = map.get('set-cookie') ?? [];
  for (const cookie of cookies) {
    const cookieName = cookie.split('=')[0] || 'cookie';
    if (!/;\s*secure/i.test(cookie)) checks.push({ name: `Cookie ${cookieName}`, status: 'warn', detail: 'Missing Secure.' });
    if (!/;\s*httponly/i.test(cookie)) checks.push({ name: `Cookie ${cookieName}`, status: 'warn', detail: 'Missing HttpOnly.' });
    if (!/;\s*samesite/i.test(cookie)) checks.push({ name: `Cookie ${cookieName}`, status: 'warn', detail: 'Missing SameSite.' });
  }

  const allowOrigin = get('access-control-allow-origin');
  if (allowOrigin === '*' && /true/i.test(get('access-control-allow-credentials'))) {
    checks.push({ name: 'CORS', status: 'fail', detail: 'Wildcard origin with credentials is invalid and dangerous.' });
  } else if (allowOrigin === '*') {
    checks.push({ name: 'CORS', status: 'warn', detail: 'Wildcard origin allows any site to read public responses.' });
  }

  let score = 100;
  for (const check of checks) {
    if (check.status === 'fail') score -= 12;
    else if (check.status === 'warn') score -= 5;
  }
  score = Math.max(0, score);
  const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  if (!/^https/i.test(source) && !hsts) {
    warnings.push('These checks assume an HTTPS response. HSTS and Secure cookies only matter over HTTPS.');
  }
  warnings.push('This is a static review of pasted headers. It cannot verify runtime behaviour, redirects or server configuration.');
  return { grade, score, checks, warnings };
}

export const securityHeaders: ToolDefinition = {
  id: 'security-headers',
  name: 'Security header analyzer',
  summary: 'Grade pasted HTTP response headers for CSP, HSTS, framing, cookies and CORS.',
  category: 'security',
  version: '1.0.0',
  tags: ['security', 'headers', 'csp', 'hsts', 'cors'],
  aliases: ['header audit', 'security headers check'],
  privacy: { locality: 'local', note: 'Headers are analyzed locally. Nothing is fetched.' },
  input: {
    label: 'Raw response headers',
    sample: `HTTP/2 200
content-type: text/html; charset=utf-8
strict-transport-security: max-age=63072000; includeSubDomains
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
content-security-policy: default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'
permissions-policy: camera=(), microphone=(), geolocation=()
set-cookie: session=abc123; Secure; HttpOnly; SameSite=Lax
server: nginx/1.27.1`,
    rows: 14,
  },
  run(input): ToolResult {
    const audit = analyzeSecurityHeaders(assertInput(input, 'Headers'));
    const output = [
      `Grade: ${audit.grade} (${audit.score}/100)`,
      '',
      ...audit.checks.map((check) => `[${check.status.toUpperCase()}] ${check.name}: ${check.detail}`),
      '',
      'Notes',
      ...audit.warnings.map((warning) => `- ${warning}`),
    ].join('\n');
    return {
      output,
      meta: [
        { label: 'Grade', value: audit.grade },
        { label: 'Checks', value: String(audit.checks.length) },
      ],
      warnings: audit.warnings,
    };
  },
  docs: {
    about:
      'Checks a pasted header set against common browser security controls and produces an indicative grade.',
    limitations: [
      'It only sees the headers you paste; redirects, multiple responses and runtime behavior are invisible.',
      'The grade is a heuristic checklist, not a security certification.',
      'CSP correctness depends on the whole policy and the application; keyword checks are shallow.',
    ],
  },
};
