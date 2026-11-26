import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Layers } from 'lucide-react';
import { domains } from '@/packages/tool-sdk/domains';
import { tools, featuredTools } from '@/packages/tool-sdk/registry';
import { ToolCard } from '@/packages/ui/tool-card';
import { PageHeader, SectionHeading } from '@/packages/ui/page';
import { Badge } from '@/packages/ui/surface';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Overview',
  description: 'All developer tools, grouped by category.',
};

const toolDomains = domains.filter((d) => d.kind === 'tools');

export default function Dashboard() {
  const featured = featuredTools();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Every tool runs in this browser tab. Nothing is uploaded."
      />

      <SectionHeading
        title="Featured"
        description="Start here with the most-used tools."
        action={
          <Link href="/tools" className="text-xs font-medium text-accent hover:underline">
            See all {tools.length} tools <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {featured.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>

      <SectionHeading
        title="Categories"
        description="Pick a domain to browse its tools."
        action={
          <Link href="/tools" className="text-xs font-medium text-accent hover:underline">
            Browse all <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {toolDomains.map((domain) => {
          const count = tools.filter((t) => t.category === domain.toolCategories?.[0]).length;
          return (
            <Link
              key={domain.id}
              href={domain.href}
              className={cn(
                'flex items-center justify-between gap-3 rounded-card border p-4 transition-colors',
                'border-line hover:border-line-strong hover:bg-surface/80',
              )}
            >
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 shrink-0 text-ink-2" aria-hidden />
                  <h3 className="text-[14px] font-medium text-ink">{domain.name}</h3>
                </div>
                <p className="mt-0.5 text-[12px] text-muted">{domain.description}</p>
              </div>
              <Badge>{count}</Badge>
            </Link>
          );
        })}
      </div>

      <SectionHeading
        title="All tools"
        description="A flat list of every tool."
        action={
          <Link href="/tools" className="text-xs font-medium text-accent hover:underline">
            View list <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}
