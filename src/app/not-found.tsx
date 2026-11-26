import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from '@/packages/ui/page';
import { EmptyState } from '@/packages/ui/surface';

export const metadata: Metadata = {
  title: 'Not found',
};

export default function NotFound() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Page not found"
        description="The page you are looking for does not exist."
      />
      <EmptyState
        title="Nothing here"
        description="Check the URL or return to the tools overview."
        action={
          <Link
            href="/tools"
            className="inline-flex items-center gap-2 rounded-control border border-line-strong bg-surface px-3 py-2 text-xs text-ink transition-colors hover:bg-surface/80"
          >
            <ArrowRight className="h-3 w-3" aria-hidden />
            Browse all tools
          </Link>
        }
      />
    </div>
  );
}
