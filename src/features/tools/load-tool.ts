import type { ToolCategoryId, ToolDefinition } from '@/packages/tool-sdk/types';

/**
 * Tool logic is split by category. The runner imports only the category chunk it
 * needs, so opening one tool does not download the other 50 implementations.
 */
const loaders: Record<ToolCategoryId, () => Promise<readonly ToolDefinition[]>> = {
  code: () => import('@/tools/code-utilities').then((module) => module.codeTools),
  git: () => import('@/tools/git-tools').then((module) => module.gitTools),
  api: () => import('@/tools/api-tools').then((module) => module.apiTools),
  quality: () => import('@/tools/code-quality').then((module) => module.qualityTools),
  database: () => import('@/tools/database-tools').then((module) => module.databaseTools),
  security: () => import('@/tools/security-tools').then((module) => module.securityTools),
  devops: () => import('@/tools/devops-tools').then((module) => module.devopsTools),
  frontend: () => import('@/tools/frontend-tools').then((module) => module.frontendTools),
  backend: () => import('@/tools/backend-tools').then((module) => module.backendTools),
};

const cache = new Map<ToolCategoryId, Promise<readonly ToolDefinition[]>>();

function loadCategory(category: ToolCategoryId): Promise<readonly ToolDefinition[]> {
  let pending = cache.get(category);
  if (!pending) {
    pending = loaders[category]();
    cache.set(category, pending);
  }
  return pending;
}

export async function loadToolRun(
  category: ToolCategoryId,
  id: string,
): Promise<ToolDefinition['run']> {
  const tools = await loadCategory(category);
  const tool = tools.find((entry) => entry.id === id);
  if (!tool) {
    throw new Error(`Tool "${id}" is not available in the ${category} bundle.`);
  }
  return tool.run;
}
