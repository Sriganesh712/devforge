'use client';

import type { CSSProperties } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import type { ToolUiProps } from './types';
import { CodeBlock, CustomPanel, InlineCopy, ToolErrorNote } from './shared';
import { Badge } from '@/packages/ui/surface';
import { Button } from '@/packages/ui/button';
import {
  contrastResult,
  parseColor,
  relativeLuminance,
  toHex,
  toHslString,
  toRgbString,
  type RGBA,
} from '@/packages/core/color';
import { buildBoxShadow, buildFlexbox, buildGradient } from '@/tools/frontend-tools/frontend';

function errorMessage(caught: unknown): string {
  return caught instanceof Error ? caught.message : 'The input could not be processed.';
}

export function GradientUi({ input, options }: ToolUiProps) {
  const colors = input
    .split(/[,\n]/)
    .map((value) => value.trim())
    .filter(Boolean);
  const type = String(options.type ?? 'linear') as 'linear' | 'radial' | 'conic';
  const angle = Number(options.angle ?? 135);
  let css = '';
  let error: string | null = null;
  try {
    css = buildGradient(
      type,
      angle,
      colors.map((color) => ({ color })),
    );
  } catch (caught) {
    error = errorMessage(caught);
  }
  const parsedStops = colors
    .map((color) => ({ input: color, color: parseColor(color) }))
    .filter((stop): stop is { input: string; color: RGBA } => Boolean(stop.color));

  return (
    <CustomPanel
      title="Gradient"
      description="Live CSS preview. Stops are evenly spaced."
      actions={<Badge>{colors.length} stops</Badge>}
    >
      <div className="flex flex-col gap-3">
        {error ? <ToolErrorNote message={error} /> : null}
        <div
          className="h-44 rounded-card border border-line"
          style={css ? { backgroundImage: css } : { background: 'var(--df-surface-2)' }}
          role="img"
          aria-label="Gradient preview"
        />
        {parsedStops.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {parsedStops.map((stop, index) => (
              <span
                key={`${stop.input}-${index}`}
                className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-2 py-1 text-[11px] text-ink-2"
              >
                <span
                  className="h-3.5 w-3.5 rounded-sm border border-line"
                  style={{ backgroundColor: toRgbString(stop.color) }}
                  aria-hidden
                />
                <span className="font-mono">{toHex(stop.color)}</span>
              </span>
            ))}
          </div>
        ) : null}
        {css ? <CodeBlock value={`background-image: ${css};`} language="css" label="Copy CSS" /> : null}
        <p className="text-[11px] leading-relaxed text-muted">
          The text input takes 2–5 comma-separated colors. Add or remove colors to change the stops.
        </p>
      </div>
    </CustomPanel>
  );
}

export function ShadowUi({ input, options }: ToolUiProps) {
  let shadow = '';
  let error: string | null = null;
  try {
    shadow = buildBoxShadow({
      x: Number(options.x ?? 0),
      y: Number(options.y ?? 12),
      blur: Number(options.blur ?? 32),
      spread: Number(options.spread ?? -12),
      color: input.trim(),
      opacity: Number(options.opacity ?? 22),
      inset: Boolean(options.inset),
    });
  } catch (caught) {
    error = errorMessage(caught);
  }

  return (
    <CustomPanel
      title="Shadow"
      description="One shadow layer, previewed on the app surface."
      actions={<Badge>{shadow ? 'live' : 'invalid'}</Badge>}
    >
      <div className="flex flex-col gap-3">
        {error ? <ToolErrorNote message={error} /> : null}
        <div className="flex min-h-44 items-center justify-center rounded-card border border-line bg-surface-2/60 p-6">
          <div
            className="flex h-28 w-full max-w-xs items-center justify-center rounded-card border border-line bg-surface text-xs text-muted"
            style={shadow ? { boxShadow: shadow } : undefined}
          >
            Shadow preview
          </div>
        </div>
        {shadow ? <CodeBlock value={`box-shadow: ${shadow};`} language="css" label="Copy CSS" /> : null}
        <p className="text-[11px] leading-relaxed text-muted">
          The color alpha is multiplied by the opacity control. Neutral shadows usually read better in product
          UI.
        </p>
      </div>
    </CustomPanel>
  );
}

function sixDigitHex(color: RGBA): string {
  const base = toHex({ ...color, a: 1 });
  return base.length === 7 ? base : '#b0450e';
}

export function ColorUi({ input, setInput }: ToolUiProps) {
  const color = parseColor(input);
  if (!color) {
    return (
      <CustomPanel title="Color" description="HEX, RGB and HSL conversions.">
        <ToolErrorNote message="Use a hex, rgb() or hsl() color, or a common color name such as teal." />
      </CustomPanel>
    );
  }
  const black = contrastResult(color, { r: 0, g: 0, b: 0, a: 1 });
  const white = contrastResult(color, { r: 255, g: 255, b: 255, a: 1 });
  const values = [
    { label: 'HEX', value: toHex(color) },
    { label: 'RGB', value: toRgbString(color) },
    { label: 'HSL', value: toHslString(color) },
  ];

  return (
    <CustomPanel
      title="Color"
      description="One color, every common notation."
      actions={<Badge>{toHex(color)}</Badge>}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div
            className="h-24 w-24 shrink-0 rounded-card border border-line"
            style={{ backgroundColor: toRgbString(color) }}
            aria-label={`Preview of ${toHex(color)}`}
          />
          <label className="flex flex-col gap-1 text-[11px] text-muted">
            Pick a color
            <input
              type="color"
              value={sixDigitHex(color)}
              onChange={(event) => setInput(event.target.value)}
              className="h-9 w-20 cursor-pointer rounded-control border border-line-strong bg-surface p-1"
              aria-label="Color picker"
            />
          </label>
          <div className="ml-auto text-right">
            <p className="font-mono text-2xl tabular-nums text-ink">{color.a.toFixed(2)}</p>
            <p className="text-[10px] text-muted">alpha</p>
          </div>
        </div>

        <div className="divide-y divide-line rounded-card border border-line">
          {values.map((item) => (
            <div key={item.label} className="flex items-center gap-2 px-3 py-2">
              <span className="w-10 text-[11px] text-muted">{item.label}</span>
              <code className="min-w-0 flex-1 truncate font-mono text-xs text-ink-2">{item.value}</code>
              <InlineCopy value={item.value} />
            </div>
          ))}
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="w-10 text-[11px] text-muted">Lum</span>
            <code className="min-w-0 flex-1 font-mono text-xs text-ink-2">
              {relativeLuminance(color).toFixed(4)}
            </code>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-card border border-line bg-surface-2/40 px-3 py-2">
            <p className="text-[10px] text-muted">On black</p>
            <p className="font-mono text-sm tabular-nums text-ink">{black.ratio.toFixed(2)}:1</p>
            <Badge tone={black.aaNormal ? 'ok' : 'danger'}>{black.aaNormal ? 'AA pass' : 'AA fail'}</Badge>
          </div>
          <div className="rounded-card border border-line bg-surface-2/40 px-3 py-2">
            <p className="text-[10px] text-muted">On white</p>
            <p className="font-mono text-sm tabular-nums text-ink">{white.ratio.toFixed(2)}:1</p>
            <Badge tone={white.aaNormal ? 'ok' : 'danger'}>{white.aaNormal ? 'AA pass' : 'AA fail'}</Badge>
          </div>
        </div>
      </div>
    </CustomPanel>
  );
}

export function ContrastUi({ input, secondary, setInput, setSecondary }: ToolUiProps) {
  const foreground = parseColor(input);
  const background = parseColor(secondary);
  if (!foreground || !background) {
    return (
      <CustomPanel title="Contrast" description="WCAG 2.2 contrast for two solid colors.">
        <ToolErrorNote message="Both the foreground and background must be valid hex, rgb() or hsl() colors." />
      </CustomPanel>
    );
  }
  const result = contrastResult(foreground, background);
  const checks = [
    { label: 'AA normal · 4.5:1', pass: result.aaNormal },
    { label: 'AA large · 3:1', pass: result.aaLarge },
    { label: 'AAA normal · 7:1', pass: result.aaaNormal },
    { label: 'AAA large · 4.5:1', pass: result.aaaLarge },
  ];

  return (
    <CustomPanel
      title="Contrast"
      description="The ratio is computed from WCAG relative luminance."
      actions={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setInput(secondary);
            setSecondary(input);
          }}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden />
          Swap
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        <div
          className="rounded-card border border-line p-6"
          style={{ backgroundColor: toRgbString(background), color: toRgbString(foreground) }}
        >
          <p className="text-2xl font-semibold">Large text sample</p>
          <p className="mt-1 text-sm">
            Normal text sample. Readable pairs keep body copy above the AA threshold.
          </p>
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] text-muted">Contrast ratio</p>
            <p className="font-mono text-3xl tabular-nums text-ink">{result.ratio.toFixed(2)}:1</p>
          </div>
          <div className="flex flex-wrap justify-end gap-1.5">
            {checks.map((check) => (
              <Badge key={check.label} tone={check.pass ? 'ok' : 'danger'}>
                {check.label}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span
            className="h-4 w-4 rounded-sm border border-line"
            style={{ backgroundColor: toRgbString(foreground) }}
            aria-hidden
          />
          <code className="font-mono">{toHex(foreground)}</code>
          <span>on</span>
          <span
            className="h-4 w-4 rounded-sm border border-line"
            style={{ backgroundColor: toRgbString(background) }}
            aria-hidden
          />
          <code className="font-mono">{toHex(background)}</code>
        </div>
        <p className="text-[11px] leading-relaxed text-muted">
          Large text is 18pt regular or 14pt bold and above. Passing a ratio does not guarantee readability;
          font, weight and context still matter.
        </p>
      </div>
    </CustomPanel>
  );
}

export function FlexboxUi({ input, options }: ToolUiProps) {
  const labels = input
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean)
    .slice(0, 12);
  const direction = String(options.direction ?? 'row');
  const justify = String(options.justify ?? 'flex-start');
  const align = String(options.align ?? 'stretch');
  const wrap = String(options.wrap ?? 'nowrap');
  const gap = Number(options.gap ?? 12);

  if (labels.length === 0) {
    return (
      <CustomPanel title="Flexbox" description="Live layout preview and copyable CSS.">
        <ToolErrorNote message="Add at least one item label, separated by commas." />
      </CustomPanel>
    );
  }

  const { css, html } = buildFlexbox({ direction, justify, align, wrap, gap, labels });
  const previewStyle: CSSProperties = {
    display: 'flex',
    flexDirection: direction as CSSProperties['flexDirection'],
    justifyContent: justify,
    alignItems: align,
    flexWrap: wrap as CSSProperties['flexWrap'],
    gap: `${gap}px`,
    minHeight: '220px',
  };

  return (
    <CustomPanel
      title="Flexbox"
      description="The preview and generated CSS use the same values."
      actions={<Badge>{labels.length} items</Badge>}
    >
      <div className="flex flex-col gap-3">
        <div
          className="rounded-card border border-line bg-surface-2/50 p-4"
          style={previewStyle}
          aria-label="Flexbox preview"
        >
          {labels.map((label, index) => (
            <div
              key={`${label}-${index}`}
              className="rounded-control border border-line-strong bg-surface px-4 py-3 font-mono text-xs text-ink-2"
            >
              {label}
            </div>
          ))}
        </div>
        <CodeBlock value={css} language="css" label="Copy CSS" />
        <CodeBlock value={html} language="html" label="Copy HTML" />
      </div>
    </CustomPanel>
  );
}
