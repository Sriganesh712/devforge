import { describe, it, expect } from 'vitest';
import { tools, toolById, getTool, searchTools, assertRegistryIntegrity, toolsByCategory } from '@/packages/tool-sdk/registry';

describe('registry', () => {
  it('has 51 tools', () => {
    expect(tools.length).toBe(51);
  });

  it('all tools have unique ids', () => {
    const ids = tools.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all tool ids are kebab-case', () => {
    for (const tool of tools) {
      expect(tool.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it('all tools have semver versions', () => {
    for (const tool of tools) {
      expect(tool.version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('all tools have summaries longer than 10 chars', () => {
    for (const tool of tools) {
      expect(tool.summary.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('all tools have sample input', () => {
    for (const tool of tools) {
      expect(tool.input.sample.length).toBeGreaterThan(0);
    }
  });

  it('toolById maps all tools', () => {
    expect(toolById.size).toBe(tools.length);
    for (const tool of tools) {
      expect(toolById.get(tool.id)).toBe(tool);
    }
  });

  it('getTool returns tool by id', () => {
    const tool = getTool('json-formatter');
    expect(tool).toBeDefined();
    expect(tool?.id).toBe('json-formatter');
  });

  it('getTool returns undefined for missing id', () => {
    expect(getTool('does-not-exist')).toBeUndefined();
  });

  it('searchTools returns results', () => {
    const results = searchTools('json');
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((r) => r.tool.id);
    expect(ids).toContain('json-formatter');
    expect(ids).toContain('json-diff');
  });

  it('searchTools returns empty for no match', () => {
    const results = searchTools('zzznothingzzz');
    expect(results.length).toBe(0);
  });

  it('assertRegistryIntegrity returns no problems', () => {
    const problems = assertRegistryIntegrity();
    expect(problems).toEqual([]);
  });

  it('toolsByCategory returns correct count', () => {
    const codeTools = toolsByCategory('code');
    expect(codeTools.length).toBeGreaterThan(0);
    for (const tool of codeTools) {
      expect(tool.category).toBe('code');
    }
  });
});
