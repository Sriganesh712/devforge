import { z } from 'zod';
import { TOOL_CATEGORY_IDS } from './types';

/**
 * Declarative plugin manifest. Community plugins cannot execute arbitrary JavaScript in
 * DevForge. They describe external tools or reference a reviewed first-party tool id.
 */
export const pluginManifestSchema = z.object({
  apiVersion: z.literal('devforge.dev/v1'),
  id: z
    .string()
    .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/, 'Use a namespaced id such as com.example.toolpack'),
  name: z.string().min(2).max(60),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Use semantic versioning (e.g. 1.2.0)'),
  description: z.string().min(20).max(240),
  author: z.string().min(2).max(80),
  license: z.string().min(2).max(40),
  homepage: z.string().url().optional(),
  repository: z.string().url().optional(),
  category: z.enum(TOOL_CATEGORY_IDS),
  permissions: z
    .array(z.enum(['clipboard.write', 'network.user-initiated', 'workspace.local']))
    .default([]),
  tools: z
    .array(
      z.object({
        id: z
          .string()
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Tool ids are lowercase kebab-case'),
        name: z.string().min(2).max(80),
        summary: z.string().min(10).max(200),
        kind: z.enum(['external', 'first-party']),
        url: z.string().url().optional(),
        toolId: z.string().optional(),
      }),
    )
    .min(1)
    .max(40),
});

export type PluginManifest = z.infer<typeof pluginManifestSchema>;

export function validatePluginManifest(value: unknown) {
  const result = pluginManifestSchema.safeParse(value);
  if (result.success) {
    const problems: string[] = [];
    for (const tool of result.data.tools) {
      if (tool.kind === 'external' && !tool.url) {
        problems.push(`Tool "${tool.id}" is external and needs a url.`);
      }
      if (tool.kind === 'first-party' && !tool.toolId) {
        problems.push(`Tool "${tool.id}" references a first-party toolId.`);
      }
    }
    if (problems.length > 0) {
      return { ok: false as const, errors: problems };
    }
    return { ok: true as const, manifest: result.data };
  }
  return {
    ok: false as const,
    errors: result.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
  };
}
