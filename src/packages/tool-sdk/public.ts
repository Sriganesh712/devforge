import { domains } from './domains';
import type { ToolDefinition } from './types';

/** A tool definition with the executable function removed, safe to pass to client components. */
export type PublicTool = Omit<ToolDefinition, 'run'>;

export interface CatalogEntry {
  id: string;
  name: string;
  summary: string;
  category: string;
  categoryName: string;
  categoryIndex: string;
  tags: readonly string[];
  aliases?: readonly string[];
  featured?: boolean;
  ui?: string;
}

export function toPublicTool(tool: ToolDefinition): PublicTool {
  const { run: _run, ...rest } = tool;
  return rest;
}

export function toCatalogEntry(tool: ToolDefinition): CatalogEntry {
  const domain = domains.find((entry) => entry.toolCategories?.includes(tool.category));
  return {
    id: tool.id,
    name: tool.name,
    summary: tool.summary,
    category: tool.category,
    categoryName: domain?.name ?? tool.category,
    categoryIndex: domain?.index ?? '',
    tags: tool.tags,
    aliases: tool.aliases,
    featured: tool.featured,
    ui: tool.ui,
  };
}
