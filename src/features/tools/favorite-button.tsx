'use client';

import { Star } from 'lucide-react';
import { useWorkspace } from '@/features/workspace/use-workspace';
import { Button } from '@/packages/ui/button';
import { cn } from '@/lib/utils';

export function FavoriteButton({ toolId }: { toolId: string }) {
  const { favoriteIds, favorite, ready } = useWorkspace();
  const saved = favoriteIds.has(toolId);

  return (
    <Button
      type="button"
      variant={saved ? 'secondary' : 'ghost'}
      size="sm"
      aria-pressed={saved}
      onClick={() => favorite(toolId)}
      title={saved ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Star
        className={cn('h-3.5 w-3.5', saved ? 'fill-accent text-accent' : 'text-muted')}
        aria-hidden
      />
      <span>{ready && saved ? 'Saved' : 'Favorite'}</span>
    </Button>
  );
}
