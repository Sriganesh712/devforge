import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTool, toolPath } from '@/packages/tool-sdk/registry';
import { toPublicTool } from '@/packages/tool-sdk/public';
import { ToolRunner } from '@/features/tools/tool-runner';
import { PageHeader, Breadcrumbs } from '@/packages/ui/page';

interface ToolPageProps {
  params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({ params }: ToolPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  return {
    title: tool ? tool.name : 'Tool',
    description: tool ? tool.summary : undefined,
  };
}

export default async function ToolPage({ params }: ToolPageProps) {
  const { slug } = await params;

  const tool = getTool(slug);

  if (!tool) {
    notFound();
  }

  const publicTool = toPublicTool(tool);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { label: 'Tools', href: '/tools' },
        { label: tool.category.charAt(0).toUpperCase() + tool.category.slice(1), href: toolPath(tool) },
        { label: tool.name },
      ]} />
      <PageHeader
        title={tool.name}
        description={tool.summary}
        actions={
          <span className="text-[11px] font-mono text-muted">
            v{tool.version}
          </span>
        }
      />
      <ToolRunner tool={publicTool} />
    </div>
  );
}
