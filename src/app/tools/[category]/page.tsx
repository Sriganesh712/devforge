import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { toolsByCategory, tools } from '@/packages/tool-sdk/registry';
import type { ToolCategoryId } from '@/packages/tool-sdk/types';
import { domains } from '@/packages/tool-sdk/domains';
import { ToolCard } from '@/packages/ui/tool-card';
import { PageHeader, Breadcrumbs } from '@/packages/ui/page';
import { Badge } from '@/packages/ui/surface';

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category } = await params;
  const domain = domains.find(
    (d) => d.toolCategories?.includes(category),
  );
  return {
    title: domain ? `${domain.name} tools` : 'Category',
    description: domain ? domain.description : undefined,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category } = await params;
  const domain = domains.find(
    (d) => d.toolCategories?.includes(category),
  );

  if (!domain) {
    notFound();
  }

  const categoryTools = toolsByCategory(category as ToolCategoryId);

  if (categoryTools.length === 0) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Tools', href: '/tools' }, { label: domain.name }]} />
      <PageHeader
        eyebrow={domain.index}
        title={domain.name}
        description={domain.description}
        actions={
          <Badge>{categoryTools.length} tool{categoryTools.length === 1 ? '' : 's'}</Badge>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {categoryTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  );
}
