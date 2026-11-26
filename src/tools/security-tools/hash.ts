import {
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

const ALGORITHMS = ['SHA-256', 'SHA-384', 'SHA-512', 'SHA-1'] as const;
type HashAlgorithm = (typeof ALGORITHMS)[number];

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function hashText(
  text: string,
  algorithm: HashAlgorithm = 'SHA-256',
  encoding: 'hex' | 'base64' = 'hex',
): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new ToolError('Web Crypto is unavailable. Use a secure context (https or localhost).');
  }
  const digest = await crypto.subtle.digest(algorithm, new TextEncoder().encode(text));
  const bytes = new Uint8Array(digest);
  return encoding === 'base64' ? toBase64(bytes) : toHex(bytes);
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return result === 0;
}

export const hashGenerator: ToolDefinition = {
  id: 'hash-generator',
  name: 'Hash generator & verifier',
  summary: 'Compute SHA-256, SHA-384, SHA-512 or SHA-1 and verify an expected digest.',
  category: 'security',
  version: '1.0.0',
  tags: ['hash', 'sha256', 'checksum', 'verify', 'security'],
  aliases: ['sha256 generator', 'checksum', 'hash verifier'],
  privacy: { locality: 'local', note: 'Hashing happens in your browser with Web Crypto.' },
  input: {
    label: 'Text to hash',
    sample: 'DevForge release 0.1.0',
    rows: 6,
  },
  options: [
    {
      kind: 'select',
      id: 'algorithm',
      label: 'Algorithm',
      defaultValue: 'SHA-256',
      choices: ALGORITHMS.map((algorithm) => ({ value: algorithm, label: algorithm })),
    },
    {
      kind: 'select',
      id: 'encoding',
      label: 'Output encoding',
      defaultValue: 'hex',
      choices: [
        { value: 'hex', label: 'Hex' },
        { value: 'base64', label: 'Base64' },
      ],
    },
    {
      kind: 'select',
      id: 'mode',
      label: 'Mode',
      defaultValue: 'generate',
      choices: [
        { value: 'generate', label: 'Generate' },
        { value: 'verify', label: 'Verify against a digest' },
      ],
    },
    { kind: 'text', id: 'expected', label: 'Expected digest', defaultValue: '' },
  ],
  async run(input, options): Promise<ToolResult> {
    const algorithm = optionString(options, 'algorithm', 'SHA-256') as HashAlgorithm;
    if (!ALGORITHMS.includes(algorithm)) throw new ToolError('Unsupported hash algorithm.');
    const encoding = optionString(options, 'encoding', 'hex') as 'hex' | 'base64';
    const mode = optionString(options, 'mode', 'generate');
    const digest = await hashText(input, algorithm, encoding);
    if (mode === 'verify') {
      const expected = optionString(options, 'expected').trim();
      if (!expected) throw new ToolError('Paste the expected digest to verify against.');
      const normalizedExpected = encoding === 'hex' ? expected.toLowerCase().replace(/\s+/g, '') : expected.trim();
      const match = constantTimeEqual(digest, normalizedExpected);
      return {
        output: [
          match ? 'Match: the digest is identical.' : 'No match: the digest is different.',
          '',
          `Computed: ${digest}`,
          `Expected: ${normalizedExpected}`,
          `Algorithm: ${algorithm}`,
        ].join('\n'),
        meta: [{ label: 'Result', value: match ? 'match' : 'no match' }],
        warnings: algorithm === 'SHA-1' ? ['SHA-1 is broken for collision resistance. Use it only for legacy checksums.'] : undefined,
      };
    }
    return {
      output: digest,
      meta: [
        { label: 'Algorithm', value: algorithm },
        { label: 'Encoding', value: encoding },
        { label: 'Input bytes', value: String(new TextEncoder().encode(input).length) },
      ],
      warnings: algorithm === 'SHA-1' ? ['SHA-1 is broken for collision resistance. Use it only for legacy checksums.'] : undefined,
    };
  },
  docs: {
    about:
      'Uses Web Crypto digest functions. Verification compares the computed digest with your expected value in constant time.',
    limitations: [
      'MD5 is not available in Web Crypto and is not offered.',
      'Only text is hashed; file hashing is not implemented in this alpha.',
      'A matching hash proves the bytes match, not that the source is trustworthy.',
    ],
  },
};
