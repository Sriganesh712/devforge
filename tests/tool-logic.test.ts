import { describe, it, expect } from 'vitest';
import { jsonFormatter } from '@/tools/code-utilities/json';
import { yamlFormatter } from '@/tools/code-utilities/text-formats';
import { regexTester } from '@/tools/code-utilities/regex';
import { cronBuilder } from '@/tools/devops-tools/devops';
import { jwtDecoder } from '@/tools/security-tools/security';
import { hashGenerator } from '@/tools/security-tools/hash';
import { passwordStrength } from '@/tools/security-tools/security';
import { securityHeaders } from '@/tools/security-tools/security';
import { sqlFormatter } from '@/tools/database-tools/sql';
import { connectionParser } from '@/tools/database-tools/sql';
import { complexityAnalyzer } from '@/tools/code-quality/quality';
import { httpStatusExplorer } from '@/tools/backend-tools/backend';
import { urlParser } from '@/tools/backend-tools/backend';
import { ToolError } from '@/packages/tool-sdk/types';

async function runTool(tool: { run: (a: string, b: Record<string, string | number | boolean>, c?: string) => unknown }, input: string, options: Record<string, string | number | boolean> = {}) {
  const result = await tool.run(input, options);
  return result as { output: string; warnings?: readonly string[] };
}

describe('tool logic', () => {
  describe('jsonFormatter', () => {
    it('formats valid JSON', async () => {
      const result = await runTool(jsonFormatter, '{"b":2,"a":1}', { mode: 'format', indent: '2' });
      expect(result.output).toContain('"a": 1');
      expect(result.output).toContain('"b": 2');
    });

    it('minifies JSON', async () => {
      const result = await runTool(jsonFormatter, '{"a": 1, "b": 2}', { mode: 'minify', indent: '2' });
      expect(result.output).toBe('{"a":1,"b":2}');
    });

    it('validates JSON', async () => {
      const result = await runTool(jsonFormatter, '{"a":1}', { mode: 'validate', indent: '2' });
      expect(result.output).toContain('Valid JSON');
    });

    it('throws on invalid JSON', () => {
      expect(() => jsonFormatter.run('{not json}', { mode: 'format', indent: '2' })).toThrow(
        ToolError,
      );
    });

    it('throws on empty input', () => {
      expect(() => jsonFormatter.run('', { mode: 'format', indent: '2' })).toThrow(ToolError);
    });
  });

  describe('yamlFormatter', () => {
    it('formats valid YAML', async () => {
      const result = await runTool(yamlFormatter, 'b: 2\na: 1\n', { mode: 'format', indent: '2', sort: false });
      expect(result.output).toContain('a: 1');
    });

    it('converts YAML to JSON', async () => {
      const result = await runTool(yamlFormatter, 'a: 1\nb: 2\n', { mode: 'json', indent: '2', sort: false });
      expect(result.output).toContain('"a": 1');
    });

    it('throws on invalid YAML', () => {
      expect(() => yamlFormatter.run('<<: *undefined', { mode: 'format', indent: '2', sort: false })).toThrow(
        ToolError,
      );
    });
  });

  describe('regexTester', () => {
    it('finds matches', async () => {
      const result = await runTool(regexTester, 'Order #1042 shipped.', {
        pattern: 'Order #(\\d+)',
        flags: 'g',
      });
      expect(result.output).toContain('1042');
    });

    it('reports no matches', async () => {
      const result = await runTool(regexTester, 'hello world', { pattern: 'xyz', flags: 'g' });
      expect(result.output).toBe('No matches.');
    });

    it('throws on invalid pattern', () => {
      expect(() => regexTester.run('text', { pattern: '(', flags: '' })).toThrow(ToolError);
    });

    it('throws on empty pattern', () => {
      expect(() => regexTester.run('text', { pattern: '', flags: '' })).toThrow(ToolError);
    });
  });

  describe('cronBuilder', () => {
    it('parses valid cron', async () => {
      const result = await runTool(cronBuilder, '0 9 * * 1-5', { count: 5 });
      expect(result.output).toContain('0 9 * * 1-5');
      expect(result.output).toContain('Next runs');
    });

    it('throws on invalid cron', () => {
      expect(() => cronBuilder.run('not a cron', { count: 5 })).toThrow(ToolError);
    });

    it('throws on wrong field count', () => {
      expect(() => cronBuilder.run('0 9 * *', { count: 5 })).toThrow(ToolError);
    });
  });

  describe('jwtDecoder', () => {
    it('decodes a valid JWT', async () => {
      const token =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiQWRhIn0.signature';
      const result = await runTool(jwtDecoder, token);
      expect(result.output).toContain('Algorithm: HS256');
      expect(result.output).toContain('123');
    });

    it('throws on invalid JWT', () => {
      expect(() => jwtDecoder.run('not.a.jwt', {})).toThrow(ToolError);
    });

    it('throws on empty input', () => {
      expect(() => jwtDecoder.run('', {})).toThrow(ToolError);
    });
  });

  describe('hashGenerator', () => {
    it('generates SHA-256 hash', async () => {
      const result = await runTool(hashGenerator, 'hello', {
        algorithm: 'SHA-256',
        encoding: 'hex',
        mode: 'generate',
        expected: '',
      });
      expect(result.output).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
    });

    it('verifies matching hash', async () => {
      const result = await runTool(hashGenerator, 'hello', {
        algorithm: 'SHA-256',
        encoding: 'hex',
        mode: 'verify',
        expected: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
      });
      expect(result.output).toContain('Match:');
    });

    it('reports no match', async () => {
      const result = await runTool(hashGenerator, 'hello', {
        algorithm: 'SHA-256',
        encoding: 'hex',
        mode: 'verify',
        expected: '0000000000000000000000000000000000000000000000000000000000000000',
      });
      expect(result.output).toContain('No match:');
    });

    it('warns on SHA-1', async () => {
      const result = await runTool(hashGenerator, 'hello', {
        algorithm: 'SHA-1',
        encoding: 'hex',
        mode: 'generate',
        expected: '',
      });
      expect(result.warnings).toContain(
        'SHA-1 is broken for collision resistance. Use it only for legacy checksums.',
      );
    });
  });

  describe('passwordStrength', () => {
    it('rates weak password', async () => {
      const result = await runTool(passwordStrength, '123');
      expect(result.output).toContain('Very weak');
    });

    it('rates strong password', async () => {
      const result = await runTool(passwordStrength, 'correct horse battery staple');
      expect(result.output).toContain('Very strong');
    });

    it('handles empty input', () => {
      expect(() => passwordStrength.run('', {})).toThrow(ToolError);
    });
  });

  describe('securityHeaders', () => {
    it('grades headers', async () => {
      const input = `HTTP/2 200
content-type: text/html
strict-transport-security: max-age=63072000; includeSubDomains
x-content-type-options: nosniff
x-frame-options: DENY
referrer-policy: strict-origin-when-cross-origin
content-security-policy: default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'`;
      const result = await runTool(securityHeaders, input);
      expect(result.output).toContain('Grade:');
    });

    it('throws on empty input', () => {
      expect(() => securityHeaders.run('', {})).toThrow(ToolError);
    });
  });

  describe('sqlFormatter', () => {
    it('formats SQL', async () => {
      const result = await runTool(sqlFormatter, 'select * from users where id = 1', {
        dialect: 'postgresql',
        keywordCase: 'upper',
      });
      expect(result.output).toContain('SELECT');
    });

    it('throws on empty input', () => {
      expect(() => sqlFormatter.run('', { dialect: 'postgresql', keywordCase: 'upper' })).toThrow(
        ToolError,
      );
    });
  });

  describe('connectionParser', () => {
    it('parses connection string', async () => {
      const result = await runTool(connectionParser, 'postgresql://user:pass@localhost:5432/mydb');
      expect(result.output).toContain('localhost');
      expect(result.output).toContain('[redacted]');
    });

    it('throws on invalid connection string', () => {
      expect(() => connectionParser.run('not-a-url', {})).toThrow(ToolError);
    });
  });

  describe('complexityAnalyzer', () => {
    it('analyzes source code', async () => {
      const result = await runTool(complexityAnalyzer, 'function f() { if (true) { return 1; } }', {
        language: 'js',
      });
      expect(result.output).toContain('complexity');
    });

    it('throws on empty input', () => {
      expect(() => complexityAnalyzer.run('', { language: 'js' })).toThrow(ToolError);
    });
  });

  describe('httpStatusExplorer', () => {
    it('finds status codes', async () => {
      const result = await runTool(httpStatusExplorer, '404', { class: 'all' });
      expect(result.output).toContain('404');
      expect(result.output).toContain('Not Found');
    });

    it('throws on no match', () => {
      expect(() => httpStatusExplorer.run('999', { class: 'all' })).toThrow(ToolError);
    });
  });

  describe('urlParser', () => {
    it('parses URL', async () => {
      const result = await runTool(urlParser, 'https://example.com:8443/path?token=secret#frag');
      expect(result.output).toContain('example.com');
      expect(result.output).toContain('[redacted]');
    });

    it('throws on invalid URL', () => {
      expect(() => urlParser.run('not a url', {})).toThrow(ToolError);
    });
  });
});
