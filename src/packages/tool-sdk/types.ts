import { z } from 'zod';

/**
 * Tool contract shared by every first-party tool and validated by the registry tests.
 * Tool logic is a pure function over strings; UI never imports another tool's internals.
 */
export const TOOL_CATEGORY_IDS = [
  'code',
  'git',
  'api',
  'quality',
  'database',
  'security',
  'devops',
  'frontend',
  'backend',
] as const;

export type ToolCategoryId = (typeof TOOL_CATEGORY_IDS)[number];

export type ToolOption =
  | {
      kind: 'select';
      id: string;
      label: string;
      defaultValue: string;
      choices: ReadonlyArray<{ value: string; label: string }>;
      help?: string;
    }
  | {
      kind: 'number';
      id: string;
      label: string;
      defaultValue: number;
      min?: number;
      max?: number;
      step?: number;
      help?: string;
    }
  | { kind: 'toggle'; id: string; label: string; defaultValue: boolean; help?: string }
  | {
      kind: 'text';
      id: string;
      label: string;
      defaultValue: string;
      placeholder?: string;
      help?: string;
    };

export type ToolOptionValues = Record<string, string | number | boolean>;

export interface ToolResult {
  output: string;
  meta?: ReadonlyArray<{ label: string; value: string }>;
  warnings?: readonly string[];
  language?: string;
}

export type ToolLocality = 'local' | 'browser-network' | 'server';

export interface ToolPrivacy {
  locality: ToolLocality;
  note: string;
}

export interface ToolInputSpec {
  label: string;
  placeholder?: string;
  sample: string;
  rows?: number;
  secondary?: { label: string; placeholder?: string; sample: string };
}

export interface ToolDocs {
  about: string;
  limitations?: readonly string[];
}

export type CustomToolUi =
  | 'regex'
  | 'jwt'
  | 'http'
  | 'cron'
  | 'markdown'
  | 'contrast'
  | 'gradient'
  | 'shadow'
  | 'flexbox'
  | 'html'
  | 'schema'
  | 'git-graph'
  | 'github'
  | 'color'
  | 'compare'
  | 'password';

export interface ToolDefinition {
  id: string;
  name: string;
  summary: string;
  category: ToolCategoryId;
  version: string;
  tags: readonly string[];
  aliases?: readonly string[];
  privacy: ToolPrivacy;
  input: ToolInputSpec;
  options?: readonly ToolOption[];
  ui?: CustomToolUi;
  run: (
    input: string,
    options: ToolOptionValues,
    secondary?: string,
  ) => ToolResult | Promise<ToolResult>;
  docs: ToolDocs;
  featured?: boolean;
}

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolError';
  }
}

export const toolMetaSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase kebab-case id')
    .min(2)
    .max(64),
  name: z.string().min(2).max(80),
  summary: z.string().min(10).max(200),
  category: z.enum(TOOL_CATEGORY_IDS),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Use semantic versioning (e.g. 1.0.0)'),
  tags: z.array(z.string().min(1).max(24)).max(12),
  aliases: z.array(z.string().min(1).max(24)).max(12).optional(),
  privacy: z.object({
    locality: z.enum(['local', 'browser-network', 'server']),
    note: z.string().min(5).max(240),
  }),
  docs: z.object({
    about: z.string().min(10),
    limitations: z.array(z.string()).optional(),
  }),
});

export function resolveOptions(
  options: readonly ToolOption[] | undefined,
  values: ToolOptionValues | undefined,
): ToolOptionValues {
  const resolved: ToolOptionValues = {};
  for (const option of options ?? []) {
    resolved[option.id] = option.defaultValue;
  }
  for (const [key, value] of Object.entries(values ?? {})) {
    if (key in resolved) resolved[key] = value;
  }
  return resolved;
}

export function optionString(options: ToolOptionValues, id: string, fallback = ''): string {
  const value = options[id];
  return typeof value === 'string' ? value : fallback;
}

export function optionNumber(options: ToolOptionValues, id: string, fallback = 0): number {
  const value = options[id];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return fallback;
}

export function optionBoolean(options: ToolOptionValues, id: string, fallback = false): boolean {
  const value = options[id];
  return typeof value === 'boolean' ? value : fallback;
}

export function assertInput(input: string, label = 'Input'): string {
  if (!input.trim()) throw new ToolError(`${label} is empty. Add some text or load the sample.`);
  return input;
}

export function bytesOf(value: string): number {
  return new TextEncoder().encode(value).length;
}
