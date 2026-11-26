'use client';

import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { CopyButton } from '@/packages/ui/copy-button';
import { EmptyState, Panel, PanelHeader } from '@/packages/ui/surface';
import { cn } from '@/lib/utils';

export function CustomPanel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Panel className={cn('flex min-h-[420px] flex-col', className)}>
      <PanelHeader title={title} description={description} actions={actions} />
      <div className="flex-1 p-4">{children}</div>
    </Panel>
  );
}

export function ToolErrorNote({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-card border border-danger/30 bg-danger/5 px-3.5 py-3 text-[13px] leading-relaxed text-danger"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </div>
  );
}

export function CodeBlock({
  value,
  label = 'Copy',
  language,
  className,
}: {
  value: string;
  label?: string;
  language?: string;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-card border border-line bg-surface-2/60', className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
        <span className="font-mono text-[10px] text-muted">{language ?? 'output'}</span>
        <CopyButton value={value} label={label} size="sm" variant="ghost" />
      </div>
      <pre className="df-scroll max-h-[360px] overflow-auto px-3.5 py-3 font-mono text-xs leading-relaxed text-ink-2">
        {value}
      </pre>
    </div>
  );
}

export function InlineCopy({ value }: { value: string }) {
  return <CopyButton value={value} size="icon" variant="ghost" label="Copy value" />;
}

export function EmptyResult({ title, description }: { title: string; description: string }) {
  return <EmptyState title={title} description={description} />;
}
