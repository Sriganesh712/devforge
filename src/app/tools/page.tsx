import type { Metadata } from 'next';
import { tools, toolsByCategory, categoryLabel, featuredTools } from '@/packages/tool-sdk/registry';
import { domains } from '@/packages/tool-sdk/domains';
import { ToolCard } from '@/packages/ui/tool-card';
import { PageHeader } from '@/packages/ui/page';
import { Badge } from '@/packages/ui/surface';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'All tools',
  description: 'Every developer tool in DevForge, listed alphabetically.',
};

const toolDomains = domains.filter((d) => d.kind === 'tools');

export default function ToolsPage() {
  const featured = featuredTools();

  return (
    <div className="space-y-8">
      <PageHeader
        title="All tools"
        description={`${tools.length} tools across ${toolDomains.length} categories. All run locally in this tab.`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="accent">{featured.length} featured</Badge>
            <Badge>{tools.length} total</Badge>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}
