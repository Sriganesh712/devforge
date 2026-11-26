import {
  assertInput,
  optionBoolean,
  optionNumber,
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';
import { contrastResult, parseColor, relativeLuminance, toHex, toHslString, toRgbString } from '@/packages/core/color';

export function buildGradient(
  type: 'linear' | 'radial' | 'conic',
  angle: number,
  stops: Array<{ color: string; position?: number }>,
): string {
  if (stops.length < 2) throw new ToolError('A gradient needs at least two color stops.');
  const parsed = stops.map((stop, index) => {
    const color = parseColor(stop.color);
    if (!color) throw new ToolError(`Stop ${index + 1} is not a valid color.`);
    const position = stop.position ?? (index / (stops.length - 1)) * 100;
    return `${toHex(color)} ${Math.round(position)}%`;
  });
  if (type === 'linear') return `linear-gradient(${angle}deg, ${parsed.join(', ')})`;
  if (type === 'radial') return `radial-gradient(circle at 50% 50%, ${parsed.join(', ')})`;
  return `conic-gradient(from ${angle}deg at 50% 50%, ${parsed.join(', ')})`;
}

export const gradientGenerator: ToolDefinition = {
  id: 'css-gradient-generator',
  name: 'CSS gradient generator',
  summary: 'Build linear, radial or conic gradients with a live preview and copyable CSS.',
  category: 'frontend',
  version: '1.0.0',
  tags: ['css', 'gradient', 'color', 'design'],
  aliases: ['gradient maker', 'css gradient'],
  privacy: { locality: 'local', note: 'Generated in your browser.' },
  ui: 'gradient',
  input: {
    label: 'Color stops',
    sample: '#b0450e, #e88449, #1d1a15',
    rows: 3,
  },
  options: [
    {
      kind: 'select',
      id: 'type',
      label: 'Type',
      defaultValue: 'linear',
      choices: [
        { value: 'linear', label: 'Linear' },
        { value: 'radial', label: 'Radial' },
        { value: 'conic', label: 'Conic' },
      ],
    },
    { kind: 'number', id: 'angle', label: 'Angle', defaultValue: 135, min: 0, max: 360, step: 5 },
  ],
  run(input, options): ToolResult {
    const colors = assertInput(input, 'Color stops')
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (colors.length < 2 || colors.length > 5) {
      throw new ToolError('Provide between 2 and 5 comma-separated colors.');
    }
    const type = optionString(options, 'type', 'linear') as 'linear' | 'radial' | 'conic';
    const angle = optionNumber(options, 'angle', 135);
    const css = buildGradient(
      type,
      angle,
      colors.map((color) => ({ color })),
    );
    return {
      output: `background-image: ${css};`,
      language: 'css',
      meta: [
        { label: 'Type', value: type },
        { label: 'Stops', value: String(colors.length) },
      ],
    };
  },
  docs: {
    about: 'Generates a single background-image declaration from evenly spaced color stops.',
    limitations: [
      'Stops are evenly spaced in the text tool; the live builder lets you move them.',
      'Generated CSS targets modern browsers and does not include vendor prefixes.',
    ],
  },
};

export interface BoxShadowConfig {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  inset: boolean;
}

export function buildBoxShadow(config: BoxShadowConfig): string {
  const parsed = parseColor(config.color);
  if (!parsed) throw new ToolError('Shadow color is not valid.');
  const alpha = Math.max(0, Math.min(1, (parsed.a ?? 1) * (config.opacity / 100)));
  const color = `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${Number(alpha.toFixed(3))})`;
  return `${config.inset ? 'inset ' : ''}${config.x}px ${config.y}px ${config.blur}px ${config.spread}px ${color}`;
}

export const shadowGenerator: ToolDefinition = {
  id: 'box-shadow-generator',
  name: 'Box shadow generator',
  summary: 'Tune offset, blur, spread, color and opacity, then copy the CSS.',
  category: 'frontend',
  version: '1.0.0',
  tags: ['css', 'shadow', 'box-shadow', 'design'],
  aliases: ['css shadow', 'box shadow'],
  privacy: { locality: 'local', note: 'Generated in your browser.' },
  ui: 'shadow',
  input: {
    label: 'Shadow color',
    sample: '#1d1a15',
    rows: 2,
  },
  options: [
    { kind: 'number', id: 'x', label: 'Offset X', defaultValue: 0, min: -50, max: 50 },
    { kind: 'number', id: 'y', label: 'Offset Y', defaultValue: 12, min: -50, max: 50 },
    { kind: 'number', id: 'blur', label: 'Blur', defaultValue: 32, min: 0, max: 120 },
    { kind: 'number', id: 'spread', label: 'Spread', defaultValue: -12, min: -50, max: 50 },
    { kind: 'number', id: 'opacity', label: 'Opacity %', defaultValue: 22, min: 0, max: 100 },
    { kind: 'toggle', id: 'inset', label: 'Inset', defaultValue: false },
  ],
  run(input, options): ToolResult {
    const color = assertInput(input, 'Shadow color').trim();
    const shadow = buildBoxShadow({
      x: optionNumber(options, 'x', 0),
      y: optionNumber(options, 'y', 12),
      blur: optionNumber(options, 'blur', 32),
      spread: optionNumber(options, 'spread', -12),
      color,
      opacity: optionNumber(options, 'opacity', 22),
      inset: optionBoolean(options, 'inset', false),
    });
    return {
      output: `box-shadow: ${shadow};`,
      language: 'css',
      meta: [{ label: 'Shadow', value: shadow }],
    };
  },
  docs: {
    about: 'Produces a single box-shadow declaration with the color alpha combined with the opacity slider.',
    limitations: [
      'One shadow layer only; stack declarations manually for layered shadows.',
      'Neutral shadows are recommended for product UI; colored shadows are a stylistic choice.',
    ],
  },
};

export const colorConverter: ToolDefinition = {
  id: 'color-converter',
  name: 'Color converter',
  summary: 'Convert HEX, RGB and HSL, with alpha, luminance and contrast against black and white.',
  category: 'frontend',
  version: '1.0.0',
  tags: ['color', 'hex', 'rgb', 'hsl', 'contrast'],
  aliases: ['hex to rgb', 'rgb to hex', 'color picker'],
  privacy: { locality: 'local', note: 'Converted in your browser.' },
  ui: 'color',
  input: {
    label: 'Color',
    sample: '#b0450e',
    rows: 2,
  },
  run(input): ToolResult {
    const color = parseColor(assertInput(input, 'Color'));
    if (!color) throw new ToolError('Use a hex, rgb() or hsl() color, or a common color name.');
    const black = contrastResult(color, { r: 0, g: 0, b: 0, a: 1 }).ratio;
    const white = contrastResult(color, { r: 255, g: 255, b: 255, a: 1 }).ratio;
    return {
      output: [
        `HEX: ${toHex(color)}`,
        `RGB: ${toRgbString(color)}`,
        `HSL: ${toHslString(color)}`,
        `Alpha: ${Number(color.a.toFixed(3))}`,
        `Relative luminance: ${relativeLuminance(color).toFixed(4)}`,
        `Contrast on black: ${black.toFixed(2)}:1`,
        `Contrast on white: ${white.toFixed(2)}:1`,
      ].join('\n'),
      meta: [{ label: 'HEX', value: toHex(color) }],
    };
  },
  docs: {
    about:
      'Parses hex, rgb()/rgba(), hsl()/hsla() and a small set of named colors. Contrast is computed with the WCAG relative-luminance formula.',
    limitations: [
      'Named color support is a short list, not the full CSS color keyword set.',
      'Alpha colors are composited over white for contrast calculations.',
    ],
  },
};

export const contrastChecker: ToolDefinition = {
  id: 'contrast-checker',
  name: 'Contrast checker',
  summary: 'Check WCAG AA and AAA contrast for text and background colors.',
  category: 'frontend',
  version: '1.0.0',
  tags: ['contrast', 'accessibility', 'wcag', 'color'],
  aliases: ['wcag contrast', 'accessibility checker'],
  privacy: { locality: 'local', note: 'Calculated in your browser.' },
  ui: 'contrast',
  input: {
    label: 'Foreground color',
    sample: '#fffaf6',
    rows: 2,
    secondary: { label: 'Background color', sample: '#b0450e' },
  },
  run(input, _options, secondary): ToolResult {
    const foreground = parseColor(assertInput(input, 'Foreground color'));
    const background = parseColor(assertInput(secondary ?? '', 'Background color'));
    if (!foreground || !background) throw new ToolError('Both colors must be valid hex, rgb() or hsl() values.');
    const result = contrastResult(foreground, background);
    const mark = (pass: boolean) => (pass ? 'pass' : 'fail');
    return {
      output: [
        `Contrast ratio: ${result.ratio.toFixed(2)}:1`,
        `AA normal text (4.5:1): ${mark(result.aaNormal)}`,
        `AA large text (3:1): ${mark(result.aaLarge)}`,
        `AAA normal text (7:1): ${mark(result.aaaNormal)}`,
        `AAA large text (4.5:1): ${mark(result.aaaLarge)}`,
        '',
        'WCAG 2.2: large text is 18pt regular or 14pt bold and above.',
      ].join('\n'),
      meta: [{ label: 'Ratio', value: `${result.ratio.toFixed(2)}:1` }],
      warnings: result.aaNormal ? undefined : ['This pair fails AA for normal-size text.'],
    };
  },
  docs: {
    about: 'Implements the WCAG contrast-ratio formula from relative luminance.',
    limitations: [
      'It checks two solid colors; gradients, images and transparency need manual review.',
      'Passing a ratio does not guarantee readability; font size, weight and context matter.',
    ],
  },
};

const JUSTIFY = ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'];
const ALIGN = ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'];
const DIRECTIONS = ['row', 'row-reverse', 'column', 'column-reverse'];
const WRAPS = ['nowrap', 'wrap', 'wrap-reverse'];

export function buildFlexbox(options: {
  direction: string;
  justify: string;
  align: string;
  wrap: string;
  gap: number;
  labels: string[];
}): { css: string; html: string } {
  const css = [
    '.flex-container {',
    '  display: flex;',
    `  flex-direction: ${options.direction};`,
    `  justify-content: ${options.justify};`,
    `  align-items: ${options.align};`,
    `  flex-wrap: ${options.wrap};`,
    `  gap: ${options.gap}px;`,
    '}',
    '',
    '.flex-item {',
    '  padding: 16px;',
    '  border: 1px solid #d6d1c7;',
    '  border-radius: 8px;',
    '  font-family: ui-monospace, monospace;',
    '}',
  ].join('\n');
  const html = `<div class="flex-container">\n${options.labels
    .map((label) => `  <div class="flex-item">${label}</div>`)
    .join('\n')}\n</div>`;
  return { css, html };
}

export const flexboxPlayground: ToolDefinition = {
  id: 'flexbox-playground',
  name: 'Flexbox playground',
  summary: 'Adjust flex direction, alignment, wrapping and gap with a live preview.',
  category: 'frontend',
  version: '1.0.0',
  tags: ['css', 'flexbox', 'layout', 'playground'],
  aliases: ['flex playground', 'flexbox generator'],
  privacy: { locality: 'local', note: 'Previewed in your browser.' },
  ui: 'flexbox',
  input: {
    label: 'Item labels',
    sample: 'One, Two, Three, Four',
    rows: 2,
  },
  options: [
    {
      kind: 'select',
      id: 'direction',
      label: 'Direction',
      defaultValue: 'row',
      choices: DIRECTIONS.map((value) => ({ value, label: value })),
    },
    {
      kind: 'select',
      id: 'justify',
      label: 'Justify',
      defaultValue: 'flex-start',
      choices: JUSTIFY.map((value) => ({ value, label: value })),
    },
    {
      kind: 'select',
      id: 'align',
      label: 'Align items',
      defaultValue: 'stretch',
      choices: ALIGN.map((value) => ({ value, label: value })),
    },
    {
      kind: 'select',
      id: 'wrap',
      label: 'Wrap',
      defaultValue: 'nowrap',
      choices: WRAPS.map((value) => ({ value, label: value })),
    },
    { kind: 'number', id: 'gap', label: 'Gap (px)', defaultValue: 12, min: 0, max: 64 },
  ],
  run(input, options): ToolResult {
    const labels = assertInput(input, 'Item labels')
      .split(',')
      .map((label) => label.trim())
      .filter(Boolean)
      .slice(0, 12);
    if (labels.length === 0) throw new ToolError('Add at least one item label.');
    const { css, html } = buildFlexbox({
      direction: optionString(options, 'direction', 'row'),
      justify: optionString(options, 'justify', 'flex-start'),
      align: optionString(options, 'align', 'stretch'),
      wrap: optionString(options, 'wrap', 'nowrap'),
      gap: optionNumber(options, 'gap', 12),
      labels,
    });
    return {
      output: `${css}\n\n<!-- markup -->\n${html}`,
      language: 'css',
      meta: [{ label: 'Items', value: String(labels.length) }],
    };
  },
  docs: {
    about: 'Generates a container and item stylesheet from the controls, with matching HTML markup.',
    limitations: ['Single container only; nested flex layouts are not modeled.'],
  },
};

export const htmlPlayground: ToolDefinition = {
  id: 'html-playground',
  name: 'HTML playground',
  summary: 'Edit HTML and CSS and preview it inside a sandboxed iframe.',
  category: 'frontend',
  version: '1.0.0',
  tags: ['html', 'css', 'playground', 'sandbox'],
  aliases: ['html preview', 'html editor'],
  privacy: { locality: 'local', note: 'Rendered in a sandboxed iframe on this page.' },
  ui: 'html',
  input: {
    label: 'HTML source',
    sample: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; background: #f4f2ec; color: #1d1a15; }
    .card { border: 1px solid #d6d1c7; border-radius: 12px; padding: 20px; background: #fbfaf7; }
    h1 { font-size: 20px; margin: 0 0 8px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Sandboxed preview</h1>
    <p>Scripts run only inside this iframe and cannot access the parent page.</p>
  </div>
</body>
</html>`,
    rows: 18,
  },
  run(input): ToolResult {
    const source = assertInput(input, 'HTML source');
    const tags = source.match(/<[a-z][^>]*>/gi)?.length ?? 0;
    const scripts = source.match(/<script\b/gi)?.length ?? 0;
    return {
      output: [
        `Characters: ${source.length}`,
        `Approximate tags: ${tags}`,
        `Script tags: ${scripts}`,
        `Inline event handlers: ${source.match(/\son[a-z]+\s*=/gi)?.length ?? 0}`,
      ].join('\n'),
      meta: [
        { label: 'Tags', value: String(tags) },
        { label: 'Scripts', value: String(scripts) },
      ],
      warnings:
        scripts > 0
          ? ['The preview runs scripts inside a sandboxed iframe with no same-origin access.']
          : undefined,
    };
  },
  docs: {
    about:
      'The preview uses an iframe with sandbox="allow-scripts" and no allow-same-origin, so page scripts cannot reach the DevForge document or local storage.',
    limitations: [
      'External network requests from preview code are subject to the page CSP and the sandbox.',
      'The iframe cannot be used to test browser extensions or service workers.',
      'Treat the preview as untrusted code, even though it is isolated.',
    ],
  },
};

export const svgOptimizer: ToolDefinition = {
  id: 'svg-optimizer',
  name: 'SVG optimizer',
  summary: 'Strip comments, metadata, editor attributes and extra whitespace from SVG source.',
  category: 'frontend',
  version: '1.0.0',
  tags: ['svg', 'optimize', 'minify', 'assets'],
  aliases: ['svg minify', 'svg cleanup'],
  privacy: { locality: 'local', note: 'Processed in your browser.' },
  input: {
    label: 'SVG source',
    sample: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" width="24" height="24" viewBox="0 0 24 24">
  <!-- generated icon -->
  <metadata>Created in an editor</metadata>
  <path d="M4.000 4.000 L20.000 20.000" stroke="#1d1a15" stroke-width="1.500"/>
</svg>`,
    rows: 12,
  },
  options: [
    { kind: 'toggle', id: 'comments', label: 'Remove comments', defaultValue: true },
    { kind: 'toggle', id: 'metadata', label: 'Remove metadata', defaultValue: true },
    { kind: 'toggle', id: 'editor', label: 'Remove editor attributes', defaultValue: true },
    { kind: 'toggle', id: 'whitespace', label: 'Collapse inter-tag whitespace', defaultValue: true },
    { kind: 'number', id: 'precision', label: 'Decimal precision', defaultValue: 2, min: 0, max: 4 },
  ],
  run(input, options): ToolResult {
    const source = assertInput(input, 'SVG source');
    if (!/<svg[\s>]/i.test(source)) throw new ToolError('This does not look like an SVG: no <svg> element found.');
    let output = source;
    if (optionBoolean(options, 'comments', true)) output = output.replace(/<!--[\s\S]*?-->/g, '');
    if (optionBoolean(options, 'metadata', true)) {
      output = output
        .replace(/<metadata[\s\S]*?<\/metadata>/gi, '')
        .replace(/<title[\s\S]*?<\/title>/gi, '')
        .replace(/<desc[\s\S]*?<\/desc>/gi, '')
        .replace(/<\?xml[\s\S]*?\?>/gi, '')
        .replace(/<!DOCTYPE[\s\S]*?>/gi, '');
    }
    if (optionBoolean(options, 'editor', true)) {
      output = output
        .replace(/\s(?:inkscape|sodipodi|adobe|figma|sketch):[\w-]+="[^"]*"/gi, '')
        .replace(/\sxmlns:(?:inkscape|sodipodi|adobe|figma|sketch)="[^"]*"/gi, '')
        .replace(/\s(?:data-name|data-testid)="[^"]*"/gi, '');
    }
    if (optionBoolean(options, 'whitespace', true)) {
      output = output.replace(/>\s+</g, '><').replace(/\s{2,}/g, ' ').trim();
    }
    const precision = Math.round(optionNumber(options, 'precision', 2));
    output = output.replace(/-?\d+\.\d+/g, (value) =>
      String(Number(Number(value).toFixed(precision))),
    );
    const before = new TextEncoder().encode(source).length;
    const after = new TextEncoder().encode(output).length;
    return {
      output,
      language: 'xml',
      meta: [
        { label: 'Before', value: `${before} B` },
        { label: 'After', value: `${after} B` },
        { label: 'Saved', value: `${Math.max(0, Math.round((1 - after / before) * 100))}%` },
      ],
      warnings: [
        'This is a regex-based cleanup, not a full SVG optimizer. Render the result before shipping.',
        'Optimization can remove accessibility metadata; keep title/desc when the SVG conveys meaning.',
      ],
    };
  },
  docs: {
    about:
      'Removes comments, metadata, common editor namespaces and redundant whitespace, and rounds decimal numbers.',
    limitations: [
      'It does not merge paths, remove unused defs or optimize path data.',
      'Removing title/desc also removes accessible names; opt out for meaningful images.',
      'The output should be visually checked before it replaces an asset.',
    ],
  },
};
