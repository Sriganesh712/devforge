import { describe, it, expect } from 'vitest';
import { validatePluginManifest, pluginManifestSchema } from '@/packages/tool-sdk/plugin';

describe('plugin manifest validation', () => {
  const validManifest = {
    apiVersion: 'devforge.dev/v1',
    id: 'com.example.toolpack',
    name: 'Example Tool Pack',
    version: '1.0.0',
    description: 'A set of example tools for DevForge.',
    author: 'Example Author',
    license: 'MIT',
    category: 'code',
    permissions: ['clipboard.write'],
    tools: [
      {
        id: 'example-tool',
        name: 'Example Tool',
        summary: 'An example tool.',
        kind: 'first-party',
        toolId: 'json-formatter',
      },
    ],
  };

  it('accepts a valid manifest', () => {
    const result = validatePluginManifest(validManifest);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.manifest.id).toBe('com.example.toolpack');
    }
  });

  it('rejects invalid apiVersion', () => {
    const result = validatePluginManifest({ ...validManifest, apiVersion: 'v1' });
    expect(result.ok).toBe(false);
  });

  it('rejects non-kebab-case tool id', () => {
    const bad = {
      ...validManifest,
      tools: [{ ...validManifest.tools[0], id: 'Example Tool' }],
    };
    const result = validatePluginManifest(bad);
    expect(result.ok).toBe(false);
  });

  it('rejects external tool without url', () => {
    const bad = {
      ...validManifest,
      tools: [{ ...validManifest.tools[0], kind: 'external' as const }],
    };
    const result = validatePluginManifest(bad);
    expect(result.ok).toBe(false);
  });

  it('rejects first-party tool without toolId', () => {
    const bad = {
      ...validManifest,
      tools: [{ ...validManifest.tools[0], kind: 'first-party' as const, toolId: undefined }],
    };
    const result = validatePluginManifest(bad);
    expect(result.ok).toBe(false);
  });

  it('rejects empty tools array', () => {
    const bad = { ...validManifest, tools: [] };
    const result = validatePluginManifest(bad);
    expect(result.ok).toBe(false);
  });

  it('rejects too many tools (max 40)', () => {
    const tooMany = Array.from({ length: 41 }, (_, i) => ({
      id: `tool-${i}`,
      name: `Tool ${i}`,
      summary: 'A tool.',
      kind: 'first-party' as const,
      toolId: 'json-formatter',
    }));
    const bad = { ...validManifest, tools: tooMany };
    const result = validatePluginManifest(bad);
    expect(result.ok).toBe(false);
  });

  it('accepts manifest with no optional fields', () => {
    const minimal = {
      apiVersion: 'devforge.dev/v1',
      id: 'com.example.min',
      name: 'Minimal',
      version: '0.1.0',
      description: 'A minimal plugin manifest.',
      author: 'Author',
      license: 'Apache-2.0',
      category: 'security',
      tools: [
        {
          id: 'min-tool',
          name: 'Min Tool',
          summary: 'A minimal tool.',
          kind: 'external',
          url: 'https://example.com/tool',
        },
      ],
    };
    const result = validatePluginManifest(minimal);
    expect(result.ok).toBe(true);
  });

  it('schema validates version format', () => {
    const bad = { ...validManifest, version: '1.0' };
    const result = validatePluginManifest(bad);
    expect(result.ok).toBe(false);
  });
});
