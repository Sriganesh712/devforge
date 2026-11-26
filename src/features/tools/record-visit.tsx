'use client';

import { useEffect, useRef } from 'react';
import { useWorkspace } from '@/features/workspace/use-workspace';

export function RecordVisit({ toolId }: { toolId: string }) {
  const { recordVisit } = useWorkspace();
  const recorded = useRef(false);

  useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    recordVisit(toolId);
  }, [toolId, recordVisit]);

  return null;
}
