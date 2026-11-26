import { codeTools } from '@/tools/code-utilities';
import { gitTools } from '@/tools/git-tools';
import { apiTools } from '@/tools/api-tools';
import { qualityTools } from '@/tools/code-quality';
import { databaseTools } from '@/tools/database-tools';
import { securityTools } from '@/tools/security-tools';
import { devopsTools } from '@/tools/devops-tools';
import { frontendTools } from '@/tools/frontend-tools';
import { backendTools } from '@/tools/backend-tools';
import { domains } from './domains';
import { rankTools } from './search';
import type { ToolCategoryId, ToolDefinition } from './types';

export const tools: readonly ToolDefinition[] = [
  ...codeTools,
  ...gitTools,
  ...apiTools,
  ...qualityTools,
  ...databaseTools,
  ...securityTools,
  ...devopsTools,
  ...frontendTools,
  ...backendTools,
];

export const toolById = new Map(tools.map((tool) => [tool.id, tool]));

export function getTool(id: string): ToolDefinition | undefined {
  return toolById.get(id);
}

export function toolPath(tool: Pick<ToolDefinition, 'category' | 'id'>): string {
  return `/tools/${tool.category}/${tool.id}`;
}

export function toolsByCategory(category: ToolCategoryId): ToolDefinition[] {
  return tools.filter((tool) => tool.category === category);
}

export function categoryToolCount(category: ToolCategoryId): number {
  return toolsByCategory(category).length;
}

export function domainForCategory(category: ToolCategoryId) {
  return domains.find((domain) => domain.toolCategories?.includes(category));
}

export function categoryLabel(category: ToolCategoryId): string {
  return domainForCategory(category)?.name ?? category;
}

export function searchTools(query: string, limit = 24) {
  const searchable = tools.map((tool) => ({
    ...tool,
    categoryName: categoryLabel(tool.category),
  }));
  return rankTools(searchable, query, limit).map(({ tool, score }) => ({
    tool: tool as ToolDefinition,
    score,
  }));
}

export function relatedTools(tool: ToolDefinition, limit = 4): ToolDefinition[] {
  const others = tools.filter((candidate) => candidate.id !== tool.id);
  const sharedTag = (candidate: ToolDefinition) =>
    candidate.tags.filter((tag) => tool.tags.includes(tag)).length;
  return others
    .map((candidate) => ({
      candidate,
      score: (candidate.category === tool.category ? 3 : 0) + sharedTag(candidate),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.name.localeCompare(b.candidate.name))
    .slice(0, limit)
    .map((entry) => entry.candidate);
}

export function featuredTools(): ToolDefinition[] {
  return tools.filter((tool) => tool.featured);
}

export function assertRegistryIntegrity(): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const tool of tools) {
    if (ids.has(tool.id)) problems.push(`Duplicate tool id: ${tool.id}`);
    ids.add(tool.id);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tool.id)) {
      problems.push(`Tool id is not kebab-case: ${tool.id}`);
    }
    if (!/^\d+\.\d+\.\d+$/.test(tool.version)) {
      problems.push(`Tool ${tool.id} has a non-semver version: ${tool.version}`);
    }
    if (!tool.summary || tool.summary.length < 10) {
      problems.push(`Tool ${tool.id} needs a longer summary.`);
    }
    if (!tool.input.sample) problems.push(`Tool ${tool.id} has no sample input.`);
  }
  return problems;
}
