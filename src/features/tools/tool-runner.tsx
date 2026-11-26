'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { AlertTriangle, Loader2, Play, RotateCcw } from 'lucide-react';
import type { PublicTool } from '@/packages/tool-sdk/public';
import {
  resolveOptions,
  type ToolOptionValues,
  type ToolResult,
} from '@/packages/tool-sdk/types';
import { Button } from '@/packages/ui/button';
import { CopyButton, DownloadButton } from '@/packages/ui/copy-button';
import { Checkbox, Field, Input, Select, Textarea } from '@/packages/ui/field';
import { Badge, EmptyState, Kbd, Panel, PanelHeader } from '@/packages/ui/surface';
import { cn } from '@/lib/utils';
import { loadToolRun } from './load-tool';
import { customToolComponents } from './custom';
import type { ToolUiProps } from './custom/types';

function initialOptions(tool: PublicTool): ToolOptionValues {
  return resolveOptions(tool.options, undefined);
}

function localityLabel(tool: PublicTool): { label: string; tone: 'ok' | 'warn' | 'neutral' } {
  if (tool.privacy.locality === 'local') return { label: 'Local', tone: 'ok' };
  if (tool.privacy.locality === 'browser-network') return { label: 'Browser network', tone: 'warn' };
  return { label: 'Server', tone: 'neutral' };
}

function InputForSpec({
  id,
  label,
  placeholder,
  value,
  onChange,
  rows,
  secret = false,
}: {
  id: string;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  secret?: boolean;
}) {
  const multiline = (rows ?? 2) > 2;
  return (
    <Field label={label} htmlFor={id}>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
        />
      ) : (
        <Input
          id={id}
          value={value}
          placeholder={placeholder}
          type={secret ? 'password' : 'text'}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

function OptionsPanel({
  tool,
  options,
  setOption,
}: {
  tool: PublicTool;
  options: ToolOptionValues;
  setOption: (id: string, value: string | number | boolean) => void;
}) {
  if (!tool.options || tool.options.length === 0) return null;

  return (
    <Panel>
      <PanelHeader title="Options" description="Defaults are chosen to show a useful result." />
      <div className="grid gap-3.5 p-4 sm:grid-cols-2">
        {tool.options.map((option) => {
          const id = `${tool.id}-${option.id}`;
          const value = options[option.id];
          if (option.kind === 'toggle') {
            return (
              <div key={option.id} className="flex flex-col gap-1.5 pt-1">
                <Checkbox
                  label={option.label}
                  checked={Boolean(value)}
                  onChange={(event) => setOption(option.id, event.target.checked)}
                />
                {option.help ? <p className="text-xs leading-relaxed text-muted">{option.help}</p> : null}
              </div>
            );
          }
          if (option.kind === 'select') {
            return (
              <Field key={option.id} label={option.label} htmlFor={id} help={option.help}>
                <Select
                  id={id}
                  value={String(value ?? option.defaultValue)}
                  onChange={(event) => setOption(option.id, event.target.value)}
                >
                  {option.choices.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </Select>
              </Field>
            );
          }
          if (option.kind === 'number') {
            return (
              <Field key={option.id} label={option.label} htmlFor={id} help={option.help}>
                <Input
                  id={id}
                  type="number"
                  value={String(value ?? option.defaultValue)}
                  min={option.min}
                  max={option.max}
                  step={option.step}
                  onChange={(event) =>
                    setOption(option.id, event.target.value === '' ? 0 : Number(event.target.value))
                  }
                />
              </Field>
            );
          }
          return (
            <Field key={option.id} label={option.label} htmlFor={id} help={option.help}>
              <Input
                id={id}
                value={String(value ?? option.defaultValue)}
                placeholder={option.placeholder}
                onChange={(event) => setOption(option.id, event.target.value)}
              />
            </Field>
          );
        })}
      </div>
    </Panel>
  );
}

function ResultMeta({ result }: { result: ToolResult }) {
  return (
    <div className="flex flex-col gap-3">
      {result.meta && result.meta.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {result.meta.map((item) => (
            <Badge key={`${item.label}-${item.value}`}>
              <span className="text-muted">{item.label}</span>
              <span className="text-ink-2">{item.value}</span>
            </Badge>
          ))}
        </div>
      ) : null}
      {result.warnings && result.warnings.length > 0 ? (
        <div className="rounded-card border border-warn/25 bg-warn/5 px-3.5 py-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-warn">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Read before using
          </div>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-ink-2">
            {result.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
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

function GenericOutput({
  tool,
  result,
  error,
  running,
}: {
  tool: PublicTool;
  result: ToolResult | null;
  error: string | null;
  running: boolean;
}) {
  return (
    <Panel className="flex min-h-[420px] flex-col">
      <PanelHeader
        title="Result"
        description={result?.language ? `Output language: ${result.language}` : 'Computed in this browser tab.'}
        actions={
          result ? (
            <>
              <CopyButton value={result.output} label="Copy" size="sm" />
              <DownloadButton value={result.output} filename={`${tool.id}.txt`} label="Download" />
            </>
          ) : null
        }
      />
      <div className="flex flex-1 flex-col gap-3 p-4" aria-live="polite" aria-busy={running}>
        {error ? <ErrorNote message={error} /> : null}
        {result ? <ResultMeta result={result} /> : null}
        {result ? (
          <pre className="df-scroll max-h-[560px] min-h-32 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-card border border-line bg-surface-2/50 p-3.5 font-mono text-xs leading-relaxed text-ink-2">
            {result.output}
          </pre>
        ) : error ? null : running ? (
          <div className="flex flex-1 items-center justify-center gap-2 py-12 text-sm text-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Running {tool.name.toLowerCase()}…
          </div>
        ) : (
          <EmptyState
            title="Nothing to show yet"
            description={`Run ${tool.name} to see its output. The sample input is already loaded.`}
          />
        )}
      </div>
    </Panel>
  );
}

export function ToolRunner({ tool }: { tool: PublicTool }) {
  const [input, setInput] = useState(tool.input.sample);
  const [secondary, setSecondary] = useState(tool.input.secondary?.sample ?? '');
  const [options, setOptions] = useState<ToolOptionValues>(() => initialOptions(tool));
  const [result, setResult] = useState<ToolResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const sequence = useRef(0);
  const autoRan = useRef(false);

  const execute = useCallback(
    async (nextInput: string, nextSecondary: string, nextOptions: ToolOptionValues) => {
      const current = ++sequence.current;
      setRunning(true);
      setError(null);
      try {
        const run = await loadToolRun(tool.category, tool.id);
        const next = await run(
          nextInput,
          nextOptions,
          tool.input.secondary ? nextSecondary : undefined,
        );
        if (current === sequence.current) setResult(next);
      } catch (caught) {
        if (current === sequence.current) {
          setResult(null);
          setError(caught instanceof Error ? caught.message : 'The tool failed unexpectedly.');
        }
      } finally {
        if (current === sequence.current) setRunning(false);
      }
    },
    [tool.category, tool.id, tool.input.secondary],
  );

  const run = useCallback(() => {
    void execute(input, secondary, options);
  }, [execute, input, secondary, options]);

  const reset = useCallback(() => {
    const nextOptions = initialOptions(tool);
    const nextInput = tool.input.sample;
    const nextSecondary = tool.input.secondary?.sample ?? '';
    setInput(nextInput);
    setSecondary(nextSecondary);
    setOptions(nextOptions);
    setResult(null);
    setError(null);
    if (!tool.ui || tool.ui === 'compare') {
      void execute(nextInput, nextSecondary, nextOptions);
    }
  }, [execute, tool]);

  const showRunBar = !tool.ui || tool.ui === 'compare';
  const autoRuns = !tool.ui || tool.ui === 'compare';

  useEffect(() => {
    if (autoRan.current || !autoRuns) return;
    autoRan.current = true;
    void execute(tool.input.sample, tool.input.secondary?.sample ?? '', initialOptions(tool));
  }, [autoRuns, execute, tool]);

  const setOption = useCallback((id: string, value: string | number | boolean) => {
    setOptions((current) => ({ ...current, [id]: value }));
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      run();
    }
  };

  const privacy = localityLabel(tool);
  const custom = tool.ui ? customToolComponents[tool.ui] : null;
  const CustomView = custom;
  const customProps: ToolUiProps = {
    tool,
    input,
    secondary,
    options,
    result,
    error,
    running,
    setInput,
    setSecondary,
    setOption,
    run,
    reset,
  };

  if (tool.ui === 'http') {
    return (
      <div onKeyDown={onKeyDown}>
        <Suspense
          fallback={
            <Panel className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-muted">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading request builder…
            </Panel>
          }
        >
          {CustomView ? <CustomView {...customProps} /> : null}
        </Suspense>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]" onKeyDown={onKeyDown}>
      <div className="flex min-w-0 flex-col gap-4">
        <Panel>
          <PanelHeader
            title="Input"
            description={tool.privacy.note}
            actions={
              <div className="flex items-center gap-2">
                <Badge tone={privacy.tone}>{privacy.label}</Badge>
                <Button type="button" variant="ghost" size="sm" onClick={reset}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Reset
                </Button>
              </div>
            }
          />
          <div className="flex flex-col gap-3.5 p-4">
            <InputForSpec
              id={`${tool.id}-input`}
              label={tool.input.label}
              placeholder={tool.input.placeholder}
              value={input}
              onChange={setInput}
              rows={tool.input.rows}
              secret={tool.ui === 'password'}
            />
            {tool.input.secondary ? (
              <InputForSpec
                id={`${tool.id}-secondary`}
                label={tool.input.secondary.label}
                placeholder={tool.input.secondary.placeholder}
                value={secondary}
                onChange={setSecondary}
                rows={tool.ui === 'contrast' ? 2 : 8}
                secret={false}
              />
            ) : null}
          </div>
        </Panel>

        <OptionsPanel tool={tool} options={options} setOption={setOption} />

        {showRunBar ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="primary" onClick={run} disabled={running}>
              {running ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Play className="h-3.5 w-3.5" aria-hidden />
              )}
              {running ? 'Running…' : 'Run'}
            </Button>
            <span className="hidden items-center gap-1 text-[11px] text-muted sm:flex">
              <Kbd>Ctrl</Kbd>
              <Kbd>↵</Kbd>
              to run
            </span>
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-muted">
            {tool.ui === 'github'
              ? 'Use Load repository to call the public GitHub API from your browser.'
              : 'This view updates as you edit. Nothing is sent anywhere unless the tool says so.'}
          </p>
        )}
      </div>

      <div className="min-w-0">
        {custom ? (
          <Suspense
            fallback={
              <Panel className="flex min-h-[420px] items-center justify-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading tool view…
              </Panel>
            }
          >
            {CustomView ? <CustomView {...customProps} /> : null}
          </Suspense>
        ) : (
          <GenericOutput tool={tool} result={result} error={error} running={running} />
        )}
      </div>
    </div>
  );
}
