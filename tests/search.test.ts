import { describe, it, expect } from 'vitest';
import { rankTools } from '@/packages/tool-sdk/search';

describe('search', () => {
  const tools = [
    {
      id: 'json-formatter',
      name: 'JSON Formatter',
      summary: 'Format, minify, sort or validate JSON.',
      category: 'code',
      categoryName: 'Code Utilities',
      tags: ['json', 'format', 'validate'],
      aliases: ['json pretty'],
      featured: true,
    },
    {
      id: 'json-diff',
      name: 'JSON Diff',
      summary: 'Compare two JSON documents.',
      category: 'code',
      categoryName: 'Code Utilities',
      tags: ['json', 'diff'],
      aliases: [],
    },
    {
      id: 'regex-tester',
      name: 'Regex Tester',
      summary: 'Test a JavaScript regular expression.',
      category: 'code',
      categoryName: 'Code Utilities',
      tags: ['regex', 'pattern'],
      aliases: ['regexp tester'],
    },
    {
      id: 'jwt-decoder',
      name: 'JWT Decoder',
      summary: 'Decode a JWT token.',
      category: 'security',
      categoryName: 'Security Lab',
      tags: ['jwt', 'token'],
      aliases: ['json web token'],
    },
  ];

  it('returns empty query sorted by featured then name', () => {
    const results = rankTools(tools, '');
    expect(results.length).toBe(4);
    expect(results[0].tool.id).toBe('json-formatter'); // featured first
    expect(results[1].tool.id).toBe('json-diff'); // alphabetical
  });

  it('matches by name', () => {
    const results = rankTools(tools, 'jwt');
    expect(results.length).toBe(1);
    expect(results[0].tool.id).toBe('jwt-decoder');
  });

  it('matches by tag', () => {
    const results = rankTools(tools, 'regex');
    expect(results.length).toBe(1);
    expect(results[0].tool.id).toBe('regex-tester');
  });

  it('matches by alias', () => {
    const results = rankTools(tools, 'regexp');
    expect(results.length).toBe(1);
    expect(results[0].tool.id).toBe('regex-tester');
  });

  it('matches by summary', () => {
    const results = rankTools(tools, 'validate');
    expect(results.length).toBe(1);
    expect(results[0].tool.id).toBe('json-formatter');
  });

  it('matches multiple tokens', () => {
    const results = rankTools(tools, 'json format');
    expect(results.length).toBe(1);
    expect(results[0].tool.id).toBe('json-formatter');
  });

  it('is case insensitive', () => {
    const results = rankTools(tools, 'JSON');
    expect(results.length).toBe(3);
  });

  it('limits results', () => {
    const results = rankTools(tools, 'json', 1);
    expect(results.length).toBe(1);
  });

  it('returns empty for no match', () => {
    const results = rankTools(tools, 'zzznothing');
    expect(results.length).toBe(0);
  });
});
