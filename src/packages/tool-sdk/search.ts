export interface SearchableTool {
  id: string;
  name: string;
  summary: string;
  category: string;
  categoryName: string;
  tags: readonly string[];
  aliases?: readonly string[];
  featured?: boolean;
}

export interface RankedTool<T extends SearchableTool> {
  tool: T;
  score: number;
}

export function rankTools<T extends SearchableTool>(
  tools: readonly T[],
  query: string,
  limit = 24,
): Array<RankedTool<T>> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [...tools]
      .sort(
        (a, b) =>
          Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, limit)
      .map((tool) => ({ tool, score: 0 }));
  }
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const results: Array<RankedTool<T>> = [];
  for (const tool of tools) {
    const haystack = [
      tool.name,
      tool.id,
      tool.summary,
      tool.categoryName,
      ...tool.tags,
      ...(tool.aliases ?? []),
    ]
      .join(' ')
      .toLowerCase();
    if (!tokens.every((token) => haystack.includes(token))) continue;
    let score = 0;
    for (const token of tokens) {
      const name = tool.name.toLowerCase();
      if (name === token) score += 20;
      else if (name.startsWith(token)) score += 15;
      else if (name.includes(token)) score += 10;
      if (tool.id.includes(token)) score += 7;
      if (tool.aliases?.some((alias) => alias.toLowerCase().includes(token))) score += 7;
      if (tool.tags.some((tag) => tag.toLowerCase().includes(token))) score += 5;
      if (tool.summary.toLowerCase().includes(token)) score += 3;
      if (tool.categoryName.toLowerCase().includes(token)) score += 2;
    }
    results.push({ tool, score });
  }
  return results
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
    .slice(0, limit);
}
