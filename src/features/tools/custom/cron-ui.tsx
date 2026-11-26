'use client';

import { useMemo, useState } from 'react';
import { Clock, Calendar, RotateCcw } from 'lucide-react';
import cronstrue from 'cronstrue';
import type { ToolUiProps } from './types';
import { CodeBlock, CustomPanel, EmptyResult, ToolErrorNote } from './shared';
import { Badge } from '@/packages/ui/surface';
import { Button } from '@/packages/ui/button';
import { CopyButton } from '@/packages/ui/copy-button';
import { cn } from '@/lib/utils';
import { parseCron, cronMatches, nextCronRuns } from '@/tools/devops-tools/devops';

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : 'The expression could not be parsed.';
}

const FIELD_LABELS = ['Minute', 'Hour', 'Day of month', 'Month', 'Day of week'];

export function CronUi({ input }: ToolUiProps) {
  const [count, setCount] = useState(5);

  const parsed = useMemo(() => {
    try {
      return { parsed: parseCron(input), error: null as string | null };
    } catch (caught) {
      return { parsed: null, error: errorMessage(caught) };
    }
  }, [input]);

  let description: string | null = null;
  if (parsed.parsed) {
    try {
      description = cronstrue.toString(parsed.parsed.expression, { use24HourTimeFormat: true });
    } catch {
      description = null;
    }
  }

  const runs = useMemo(() => {
    if (!parsed.parsed) return [];
    try {
      return nextCronRuns(parsed.parsed.expression, count);
    } catch {
      return [];
    }
  }, [parsed.parsed, count]);

  return (
    <CustomPanel
      title="Cron builder"
      description="Validates five-field cron expressions, describes them in plain English, and previews the next runs."
      actions={
        <div className="flex items-center gap-1.5">
          <CopyButton value={input} label="Copy expression" size="sm" />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setCount((current) => Math.min(current + 1, 10))}
            disabled={count >= 10}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {count} runs
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        {!parsed.parsed ? (
          <ToolErrorNote message={parsed.error ?? 'Could not parse this cron expression.'} />
        ) : null}

        {parsed.parsed ? (
          <>
            <div className="rounded-card border border-line bg-surface-2/50 p-3.5">
              <p className="mb-2 text-[11px] font-medium text-ink-2">Expression</p>
              <CodeBlock value={parsed.parsed.expression} language="text" label="Copy expression" />
            </div>

            {description ? (
              <section className="rounded-card border border-line bg-surface p-3.5">
                <div className="flex items-start gap-2 mb-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-ink-2">Plain English</p>
                    <p className="text-sm text-ink-2">{description}</p>
                  </div>
                </div>
              </section>
            ) : null}

            <section className="rounded-card border border-line bg-surface p-3.5">
              <p className="mb-2 text-[11px] font-medium text-ink-2">Fields</p>
              <div className="grid gap-2 sm:grid-cols-5">
                {parsed.parsed.fields.map((field, index) => (
                  <div key={field.raw} className="rounded-card border border-line bg-surface-2/40 px-2 py-2">
                    <p className="mb-1 text-[10px] text-muted">{FIELD_LABELS[index]}</p>
                    <p className="font-mono text-xs text-ink-2">{field.raw}</p>
                    <p className="text-[10px] text-muted">{field.values.size} value(s)</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-card border border-line bg-surface p-3.5 flex flex-col min-h-0">
              <div className="flex items-center justify-between border-b border-line px-3 py-2">
                <p className="text-[11px] font-medium text-ink-2">Next runs</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted">Local time</span>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-3">
                {runs.length > 0 ? (
                  <ul className="space-y-1.5">
                    {runs.map((run, index) => (
                      <li key={index} className="flex justify-between items-start text-[11px]">
                        <span className="font-mono text-muted">{index + 1}.</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-ink-2">{run.toLocaleString()}</span>
                          <br />
                          <span className="font-mono text-muted">{run.toISOString()} UTC</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] text-muted">No run times found in the next two years.</p>
                )}
              </div>
            </section>

            <p className="text-[10px] leading-relaxed text-muted">
              Cron uses your local timezone. Daylight-saving transitions can skip or repeat an hour.
            </p>
          </>
        ) : null}

        {!parsed.parsed && !parsed.error ? (
          <EmptyResult
            title="Enter a cron expression"
            description="Try something like `0 9 * * 1-5` for weekdays at 9 AM."
          />
        ) : null}
      </div>
    </CustomPanel>
  );
}
