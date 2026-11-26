import Link from 'next/link';
import type { PublicTool } from '@/packages/tool-sdk/public';
import { Badge } from '@/packages/ui/surface';
import { cn } from '@/lib/utils';

export function ToolCard({
  tool,
  className,
}: {
  tool: Pick<PublicTool, 'id' | 'name' | 'summary' | 'category' | 'tags' | 'privacy'>;
  className?: string;
}) {
  return (
    <Link
      href={`/tools/${tool.category}/${tool.id}`}
      className={cn(
        'group flex flex-col gap-2 rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface/80',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[14px] font-medium leading-snug text-ink group-hover:text-accent">
          {tool.name}
        </h3>
        <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted/80">
          {tool.privacy.locality === 'local' ? 'local' : tool.privacy.locality === 'browser-network' ? 'browser' : 'server'}
        </span>
      </div>
      <p className="line-clamp-2 text-[12.5px] leading-relaxed text-muted">{tool.summary}</p>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        {tool.tags.slice(0, 3).map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    </Link>
  );
}
