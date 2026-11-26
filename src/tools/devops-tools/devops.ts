import YAML from 'yaml';
import cronstrue from 'cronstrue';
import {
  assertInput,
  optionBoolean,
  optionNumber,
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

function splitCommand(value: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value)) !== null) tokens.push(match[1] ?? match[2] ?? match[3]);
  return tokens;
}

function installLines(manager: string): string[] {
  if (manager === 'pnpm') {
    return ['RUN corepack enable', 'RUN pnpm install --frozen-lockfile'];
  }
  if (manager === 'yarn') {
    return ['RUN corepack enable', 'RUN yarn install --immutable'];
  }
  return ['RUN npm ci'];
}

function buildLine(manager: string): string {
  if (manager === 'pnpm') return 'RUN pnpm run build';
  if (manager === 'yarn') return 'RUN yarn build';
  return 'RUN npm run build';
}

function nodeDockerfile(options: Record<string, string | number | boolean>, command: string): string {
  const manager = ['pnpm', 'yarn'].includes(optionString(options, 'manager', 'npm'))
    ? optionString(options, 'manager', 'npm')
    : 'npm';
  const port = optionNumber(options, 'port', 3000);
  const multiStage = optionBoolean(options, 'multiStage', true);
  const nonRoot = optionBoolean(options, 'nonRoot', true);
  const lock =
    manager === 'pnpm' ? 'pnpm-lock.yaml' : manager === 'yarn' ? 'yarn.lock' : 'package-lock.json';
  const copyDeps = `COPY package.json ${lock} ./`;
  if (!multiStage) {
    return [
      '# syntax=docker/dockerfile:1',
      'FROM node:22-alpine',
      'WORKDIR /app',
      'ENV NODE_ENV=production',
      copyDeps,
      ...installLines(manager),
      'COPY . .',
      buildLine(manager),
      `EXPOSE ${port}`,
      ...(nonRoot ? ['USER node'] : []),
      `CMD ${JSON.stringify(splitCommand(command))}`,
    ].join('\n');
  }
  return [
    '# syntax=docker/dockerfile:1',
    'FROM node:22-alpine AS deps',
    'WORKDIR /app',
    copyDeps,
    ...installLines(manager),
    '',
    'FROM node:22-alpine AS build',
    'WORKDIR /app',
    'COPY --from=deps /app/node_modules ./node_modules',
    'COPY . .',
    buildLine(manager),
    '',
    'FROM node:22-alpine AS runtime',
    'ENV NODE_ENV=production',
    'WORKDIR /app',
    'COPY --from=build /app/package.json ./',
    'COPY --from=build /app/node_modules ./node_modules',
    'COPY --from=build /app/dist ./dist',
    'COPY --from=build /app/public ./public',
    `EXPOSE ${port}`,
    ...(nonRoot ? ['USER node'] : []),
    `CMD ${JSON.stringify(splitCommand(command))}`,
  ].join('\n');
}

function pythonDockerfile(options: Record<string, string | number | boolean>, command: string): string {
  const manager = optionString(options, 'manager', 'pip') === 'uv' ? 'uv' : 'pip';
  const port = optionNumber(options, 'port', 8000);
  const nonRoot = optionBoolean(options, 'nonRoot', true);
  const install =
    manager === 'uv'
      ? [
          'RUN pip install --no-cache-dir uv',
          'COPY pyproject.toml uv.lock* ./',
          'RUN uv sync --frozen --no-dev',
          'ENV PATH="/app/.venv/bin:$PATH"',
        ]
      : ['COPY requirements.txt ./', 'RUN pip install --no-cache-dir -r requirements.txt'];
  return [
    '# syntax=docker/dockerfile:1',
    'FROM python:3.12-slim',
    'ENV PYTHONDONTWRITEBYTECODE=1 \\',
    '    PYTHONUNBUFFERED=1',
    'WORKDIR /app',
    ...install,
    'COPY . .',
    ...(nonRoot ? ['RUN useradd --create-home --uid 10001 appuser', 'USER appuser'] : []),
    `EXPOSE ${port}`,
    `CMD ${JSON.stringify(splitCommand(command))}`,
  ].join('\n');
}

function goDockerfile(options: Record<string, string | number | boolean>, command: string): string {
  const port = optionNumber(options, 'port', 8080);
  return [
    '# syntax=docker/dockerfile:1',
    'FROM golang:1.23-alpine AS build',
    'WORKDIR /src',
    'COPY go.mod go.sum ./',
    'RUN go mod download',
    'COPY . .',
    `RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/app ${command}`,
    '',
    'FROM gcr.io/distroless/static-debian12:nonroot',
    'COPY --from=build /out/app /app',
    `EXPOSE ${port}`,
    'ENTRYPOINT ["/app"]',
  ].join('\n');
}

export const dockerfileGenerator: ToolDefinition = {
  id: 'dockerfile-generator',
  name: 'Dockerfile generator',
  summary: 'Generate a multi-stage Node, Python or Go Dockerfile with a non-root runtime.',
  category: 'devops',
  version: '1.0.0',
  tags: ['docker', 'dockerfile', 'container', 'deploy'],
  aliases: ['docker file', 'containerize app'],
  privacy: { locality: 'local', note: 'Generated in your browser.' },
  input: {
    label: 'Start command',
    sample: 'node server.js',
    placeholder: 'Node/Python: start command; Go: package path such as ./cmd/server',
    rows: 2,
  },
  options: [
    {
      kind: 'select',
      id: 'stack',
      label: 'Stack',
      defaultValue: 'node',
      choices: [
        { value: 'node', label: 'Node.js' },
        { value: 'python', label: 'Python' },
        { value: 'go', label: 'Go' },
      ],
    },
    {
      kind: 'select',
      id: 'manager',
      label: 'Package manager',
      defaultValue: 'npm',
      choices: [
        { value: 'npm', label: 'npm' },
        { value: 'pnpm', label: 'pnpm' },
        { value: 'yarn', label: 'yarn' },
        { value: 'pip', label: 'pip' },
        { value: 'uv', label: 'uv' },
      ],
      help: 'Node uses npm/pnpm/yarn; Python uses pip/uv; Go uses modules.',
    },
    { kind: 'number', id: 'port', label: 'App port', defaultValue: 3000, min: 1, max: 65535 },
    { kind: 'toggle', id: 'multiStage', label: 'Multi-stage build', defaultValue: true },
    { kind: 'toggle', id: 'nonRoot', label: 'Run as non-root', defaultValue: true },
  ],
  run(input, options): ToolResult {
    const command = assertInput(input, 'Start command').trim();
    const tokens = splitCommand(command);
    if (tokens.length === 0) throw new ToolError('Add a start command.');
    const stack = optionString(options, 'stack', 'node');
    const output =
      stack === 'python'
        ? pythonDockerfile(options, command)
        : stack === 'go'
          ? goDockerfile(options, command)
          : nodeDockerfile(options, command);
    return {
      output: `${output}\n`,
      language: 'dockerfile',
      meta: [
        { label: 'Stack', value: stack },
        { label: 'Port', value: String(optionNumber(options, 'port', 3000)) },
      ],
      warnings: [
        'Review build output paths, base image versions and lockfiles before shipping. Generated config is a starting point, not a production guarantee.',
      ],
    };
  },
  docs: {
    about:
      'Produces a readable Dockerfile with pinned major base images and an explicit start command. Node supports npm, pnpm and yarn lockfiles.',
    limitations: [
      'Node multi-stage copies dist and public; adjust those paths for your framework.',
      'The Go build command builds ./... and copies one binary; monorepos need a specific package path.',
      'No secrets are injected. Use build args or a secret manager, never ENV literals in the image.',
    ],
  },
};

export const composeGenerator: ToolDefinition = {
  id: 'compose-generator',
  name: 'Docker Compose generator',
  summary: 'Generate a local Compose stack with an app, PostgreSQL and Redis.',
  category: 'devops',
  version: '1.0.0',
  tags: ['docker', 'compose', 'postgres', 'redis', 'local'],
  aliases: ['docker-compose', 'compose file'],
  privacy: { locality: 'local', note: 'Generated in your browser.' },
  input: {
    label: 'Project name',
    sample: 'devforge',
    rows: 2,
  },
  options: [
    { kind: 'number', id: 'port', label: 'App port', defaultValue: 3000, min: 1, max: 65535 },
    { kind: 'toggle', id: 'postgres', label: 'Include PostgreSQL', defaultValue: true },
    { kind: 'toggle', id: 'redis', label: 'Include Redis', defaultValue: true },
    { kind: 'toggle', id: 'expose', label: 'Expose database ports to the host', defaultValue: false },
    {
      kind: 'text',
      id: 'password',
      label: 'Local database password',
      defaultValue: 'devforge_local_only',
    },
  ],
  run(input, options): ToolResult {
    const project = assertInput(input, 'Project name').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{1,40}$/.test(project)) {
      throw new ToolError('Use a project name with lowercase letters, digits, dashes or underscores.');
    }
    const port = optionNumber(options, 'port', 3000);
    const withPostgres = optionBoolean(options, 'postgres', true);
    const withRedis = optionBoolean(options, 'redis', true);
    const expose = optionBoolean(options, 'expose', false);
    const password = optionString(options, 'password', 'devforge_local_only') || 'devforge_local_only';
    const app: Record<string, unknown> = {
      build: '.',
      ports: [`${port}:${port}`],
      environment: {
        ...(withPostgres
          ? { DATABASE_URL: `postgresql://${project}:${password}@db:5432/${project}` }
          : {}),
        ...(withRedis ? { REDIS_URL: 'redis://cache:6379' } : {}),
      },
    };
    const dependsOn = [...(withPostgres ? ['db'] : []), ...(withRedis ? ['cache'] : [])];
    if (dependsOn.length > 0) app.depends_on = dependsOn;
    const services: Record<string, unknown> = { app };
    const volumes: Record<string, unknown> = {};
    if (withPostgres) {
      services.db = {
        image: 'postgres:17-alpine',
        environment: {
          POSTGRES_USER: project,
          POSTGRES_PASSWORD: password,
          POSTGRES_DB: project,
        },
        ...(expose ? { ports: ['5432:5432'] } : {}),
        volumes: ['db-data:/var/lib/postgresql/data'],
        healthcheck: {
          test: ['CMD-SHELL', `pg_isready -U ${project} -d ${project}`],
          interval: '5s',
          timeout: '5s',
          retries: 10,
        },
      };
      volumes['db-data'] = {};
    }
    if (withRedis) {
      services.cache = {
        image: 'redis:7-alpine',
        ...(expose ? { ports: ['6379:6379'] } : {}),
      };
    }
    const doc: Record<string, unknown> = { name: project, services };
    if (Object.keys(volumes).length > 0) doc.volumes = volumes;
    const output = `${YAML.stringify(doc)}`;
    return {
      output,
      language: 'yaml',
      meta: [
        { label: 'Services', value: String(Object.keys(services).length) },
        { label: 'Project', value: project },
      ],
      warnings: [
        'This is a local development stack. Use a secret manager and managed databases for production.',
        'The database password appears in the file. Do not commit real credentials.',
      ],
    };
  },
  docs: {
    about:
      'Builds a Compose v2 file with a build-based app service, PostgreSQL 17 and Redis 7. Database ports stay private by default.',
    limitations: [
      'The app Dockerfile is expected in the current directory.',
      'No production hardening: TLS, backups, resource limits and secret management are not included.',
      'The generated password is a local placeholder; replace it before use.',
    ],
  },
};

export const actionsGenerator: ToolDefinition = {
  id: 'actions-generator',
  name: 'GitHub Actions generator',
  summary: 'Generate a Node CI workflow with install, lint, typecheck, test and build steps.',
  category: 'devops',
  version: '1.0.0',
  tags: ['github actions', 'ci', 'workflow', 'node'],
  aliases: ['ci workflow', 'github workflow'],
  privacy: { locality: 'local', note: 'Generated in your browser.' },
  input: {
    label: 'Workflow name',
    sample: 'CI',
    rows: 2,
  },
  options: [
    { kind: 'text', id: 'node', label: 'Node version', defaultValue: '22' },
    {
      kind: 'select',
      id: 'manager',
      label: 'Package manager',
      defaultValue: 'pnpm',
      choices: [
        { value: 'pnpm', label: 'pnpm' },
        { value: 'npm', label: 'npm' },
        { value: 'yarn', label: 'yarn' },
      ],
    },
    { kind: 'toggle', id: 'lint', label: 'Run lint', defaultValue: true },
    { kind: 'toggle', id: 'typecheck', label: 'Run typecheck', defaultValue: true },
    { kind: 'toggle', id: 'test', label: 'Run tests', defaultValue: true },
    { kind: 'toggle', id: 'build', label: 'Run build', defaultValue: true },
  ],
  run(input, options): ToolResult {
    const name = assertInput(input, 'Workflow name').trim();
    const node = optionString(options, 'node', '22').trim() || '22';
    const manager = optionString(options, 'manager', 'pnpm');
    const steps: Array<Record<string, unknown>> = [{ uses: 'actions/checkout@v4' }];
    if (manager === 'pnpm') {
      steps.push({ uses: 'pnpm/action-setup@v4', with: { version: 10 } });
      steps.push({ uses: 'actions/setup-node@v4', with: { 'node-version': node, cache: 'pnpm' } });
      steps.push({ run: 'pnpm install --frozen-lockfile' });
    } else if (manager === 'yarn') {
      steps.push({ uses: 'actions/setup-node@v4', with: { 'node-version': node, cache: 'yarn' } });
      steps.push({ run: 'corepack enable' });
      steps.push({ run: 'yarn install --immutable' });
    } else {
      steps.push({ uses: 'actions/setup-node@v4', with: { 'node-version': node, cache: 'npm' } });
      steps.push({ run: 'npm ci' });
    }
    const commands: Array<[string, string]> = [
      ['lint', `${manager === 'npm' ? 'npm run' : manager} lint`],
      ['typecheck', `${manager === 'npm' ? 'npm run' : manager} typecheck`],
      ['test', manager === 'npm' ? 'npm test' : `${manager} test`],
      ['build', manager === 'npm' ? 'npm run build' : `${manager} build`],
    ];
    for (const [key, command] of commands) {
      if (optionBoolean(options, key, true)) steps.push({ run: command });
    }
    const workflow = {
      name,
      on: {
        push: { branches: ['main'] },
        pull_request: {},
      },
      permissions: { contents: 'read' },
      jobs: {
        verify: {
          'runs-on': 'ubuntu-latest',
          'timeout-minutes': 20,
          steps,
        },
      },
    };
    const output = YAML.stringify(workflow);
    return {
      output,
      language: 'yaml',
      meta: [
        { label: 'Steps', value: String(steps.length) },
        { label: 'Node', value: node },
      ],
      warnings: [
        'Action versions use major tags in this template. Pin full commit SHAs in repositories with stricter supply-chain rules.',
        'The workflow assumes the listed scripts exist in package.json.',
      ],
    };
  },
  docs: {
    about:
      'Creates a single verify job with dependency caching, a read-only token and optional lint, typecheck, test and build steps.',
    limitations: [
      'Only Node projects are generated; matrix builds, services and deployments are not included.',
      'Generated action versions are major tags, not immutable commit SHAs.',
    ],
  },
};

const FIELD_SPECS = [
  { name: 'minute', min: 0, max: 59 },
  { name: 'hour', min: 0, max: 23 },
  { name: 'day of month', min: 1, max: 31 },
  { name: 'month', min: 1, max: 12 },
  { name: 'day of week', min: 0, max: 7 },
] as const;

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function parseField(raw: string, spec: (typeof FIELD_SPECS)[number], index: number): Set<number> {
  const value = raw.trim().toUpperCase();
  if (!value) throw new ToolError(`The ${spec.name} field is empty.`);
  const names = index === 3 ? MONTHS : index === 4 ? DAYS : [];
  const named = (token: string): number => {
    if (/^\d+$/.test(token)) return Number(token);
    const position = names.indexOf(token);
    if (position === -1) throw new ToolError(`"${token}" is not valid in the ${spec.name} field.`);
    return index === 3 ? position + 1 : position;
  };
  const result = new Set<number>();
  for (const part of value.split(',')) {
    if (!part) throw new ToolError(`Empty list item in the ${spec.name} field.`);
    const [base, stepText] = part.split('/');
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1 || step > spec.max) {
      throw new ToolError(`Invalid step "${stepText}" in the ${spec.name} field.`);
    }
    let start: number;
    let end: number;
    if (base === '*') {
      start = spec.min;
      end = spec.max;
    } else if (base.includes('-')) {
      const [from, to] = base.split('-');
      start = named(from);
      end = named(to);
    } else {
      start = named(base);
      end = stepText === undefined ? start : spec.max;
    }
    if (start < spec.min || end > spec.max || start > end) {
      throw new ToolError(`Range ${base} is outside ${spec.min}-${spec.max} for the ${spec.name} field.`);
    }
    for (let current = start; current <= end; current += step) result.add(current);
  }
  if (index === 4 && result.has(7)) result.add(0);
  return result;
}

export interface ParsedCron {
  expression: string;
  fields: Array<{ raw: string; values: Set<number>; restricted: boolean }>;
}

export function parseCron(expression: string): ParsedCron {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new ToolError('A cron expression needs exactly five fields: minute hour day month weekday.');
  }
  const fields = parts.map((raw, index) => ({
    raw,
    values: parseField(raw, FIELD_SPECS[index], index),
    restricted: raw !== '*',
  }));
  return { expression: parts.join(' '), fields };
}

export function cronMatches(parsed: ParsedCron, date: Date): boolean {
  const [minute, hour, dom, month, dow] = parsed.fields;
  if (!minute.values.has(date.getMinutes())) return false;
  if (!hour.values.has(date.getHours())) return false;
  if (!month.values.has(date.getMonth() + 1)) return false;
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();
  if (!dom.restricted && !dow.restricted) return true;
  if (dom.restricted && dow.restricted) {
    return dom.values.has(dayOfMonth) || dow.values.has(dayOfWeek);
  }
  if (dom.restricted) return dom.values.has(dayOfMonth);
  return dow.values.has(dayOfWeek);
}

export function nextCronRuns(expression: string, count = 5, from = new Date()): Date[] {
  const parsed = parseCron(expression);
  const results: Date[] = [];
  const cursor = new Date(from.getTime());
  cursor.setSeconds(0, 0);
  cursor.setMinutes(cursor.getMinutes() + 1);
  const cap = 60 * 24 * 366 * 2;
  for (let step = 0; step < cap && results.length < count; step += 1) {
    if (cronMatches(parsed, cursor)) results.push(new Date(cursor.getTime()));
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return results;
}

export const cronBuilder: ToolDefinition = {
  id: 'cron-builder',
  name: 'Cron builder',
  summary: 'Validate a five-field cron expression, read it in plain English and preview the next runs.',
  category: 'devops',
  version: '1.0.0',
  tags: ['cron', 'schedule', 'crontab', 'jobs'],
  aliases: ['cron generator', 'crontab', 'schedule builder'],
  privacy: { locality: 'local', note: 'Evaluated in your browser with your local timezone.' },
  ui: 'cron',
  input: {
    label: 'Cron expression',
    sample: '0 9 * * 1-5',
    rows: 2,
  },
  options: [
    { kind: 'number', id: 'count', label: 'Runs to preview', defaultValue: 5, min: 1, max: 10 },
  ],
  run(input, options): ToolResult {
    const expression = assertInput(input, 'Cron expression').trim();
    const parsed = parseCron(expression);
    let description: string;
    try {
      description = cronstrue.toString(parsed.expression, {
        use24HourTimeFormat: true,
        throwExceptionOnParseError: true,
      });
    } catch (error) {
      throw new ToolError(error instanceof Error ? error.message : 'Could not describe this cron expression.');
    }
    const count = Math.round(optionNumber(options, 'count', 5));
    const runs = nextCronRuns(parsed.expression, Math.min(Math.max(count, 1), 10));
    if (runs.length === 0) {
      throw new ToolError('No run times found in the next two years. Check impossible dates such as 31 February.');
    }
    return {
      output: [
        `Expression: ${parsed.expression}`,
        `Meaning: ${description}`,
        '',
        'Next runs (local time)',
        ...runs.map(
          (run, index) =>
            `${index + 1}. ${run.toLocaleString()}  (${run.toISOString()} UTC)`,
        ),
        '',
        'Cron uses your local timezone. Daylight-saving transitions can skip or repeat an hour.',
      ].join('\n'),
      meta: [
        { label: 'Fields', value: '5' },
        { label: 'Next runs', value: String(runs.length) },
      ],
    };
  },
  docs: {
    about:
      'Supports the standard five fields, lists, ranges, steps and JAN-DEC / SUN-SAT names. Day-of-month and day-of-week follow the usual OR rule when both are restricted.',
    limitations: [
      'Six-field cron with seconds and non-standard @macros are not supported.',
      'Preview is limited to two years of local time and is not timezone-aware beyond the browser clock.',
      'Cron on a server may use a different timezone; check the scheduler configuration.',
    ],
  },
};

const SECRET_KEY = /(secret|token|pass|key|credential|private|auth)/i;

export interface EnvIssue {
  line?: number;
  key?: string;
  level: 'error' | 'warn';
  message: string;
}

export function validateEnv(source: string, expected: string[] = []) {
  const issues: EnvIssue[] = [];
  const keys = new Map<string, number>();
  const seen = new Set<string>();
  let count = 0;
  for (const [index, raw] of source.split(/\r?\n/).entries()) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const match = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!match) {
      issues.push({ line: index + 1, level: 'error', message: 'Not a valid KEY=value line.' });
      continue;
    }
    count += 1;
    const key = match[1];
    let value = match[2];
    if (keys.has(key)) {
      issues.push({ line: index + 1, key, level: 'error', message: `Duplicate key; first defined on line ${keys.get(key)}.` });
    } else {
      keys.set(key, index + 1);
    }
    if (!seen.has(key)) seen.add(key);
    if (value.startsWith('"')) {
      const end = value.lastIndexOf('"');
      if (end <= 0) {
        issues.push({ line: index + 1, key, level: 'error', message: 'Unclosed double quote.' });
        continue;
      }
      const trailing = value.slice(end + 1).trim();
      if (trailing && !trailing.startsWith('#')) {
        issues.push({ line: index + 1, key, level: 'warn', message: 'Unexpected text after the closing quote.' });
      }
      value = value.slice(1, end);
    } else if (value.startsWith("'")) {
      const end = value.lastIndexOf("'");
      if (end <= 0) {
        issues.push({ line: index + 1, key, level: 'error', message: 'Unclosed single quote.' });
        continue;
      }
      value = value.slice(1, end);
    } else {
      value = value.replace(/\s+#.*$/, '').trim();
      if (/\s/.test(value)) {
        issues.push({ line: index + 1, key, level: 'warn', message: 'Unquoted value contains whitespace.' });
      }
    }
    if (value === '') {
      issues.push({ line: index + 1, key, level: 'warn', message: 'Empty value.' });
    }
    if (SECRET_KEY.test(key)) {
      if (value.length > 0 && value.length < 12) {
        issues.push({ line: index + 1, key, level: 'warn', message: 'Secret-looking value is short; confirm it is a real secret.' });
      }
      if (/^(changeme|secret|password|test|example|dev)$/i.test(value)) {
        issues.push({ line: index + 1, key, level: 'warn', message: 'Secret-looking value is a placeholder.' });
      }
    }
    if (value.includes('localhost') || value.includes('127.0.0.1')) {
      issues.push({ line: index + 1, key, level: 'warn', message: 'Local address in a value; check the deployment target.' });
    }
  }
  for (const key of expected) {
    if (key && !seen.has(key)) {
      issues.push({ level: 'error', key, message: 'Expected key is missing.' });
    }
  }
  return { count, keys: [...seen], issues };
}

export const envValidator: ToolDefinition = {
  id: 'env-validator',
  name: '.env validator',
  summary: 'Check an env file for duplicate keys, bad quoting, empty values and missing keys.',
  category: 'devops',
  version: '1.0.0',
  tags: ['env', 'dotenv', 'config', 'validation', 'secrets'],
  aliases: ['dotenv checker', 'environment variables'],
  privacy: { locality: 'local', note: 'The file is parsed locally and values are not echoed.' },
  input: {
    label: '.env content',
    sample: `# Local development
NODE_ENV=development
DATABASE_URL=postgresql://forge:forge@localhost:5432/devforge
API_TOKEN=changeme
PORT=3000
PORT=3001
GREETING=hello world
EMPTY=
`,
    rows: 12,
  },
  options: [
    { kind: 'text', id: 'expected', label: 'Expected keys', defaultValue: 'NODE_ENV,DATABASE_URL', placeholder: 'comma separated' },
  ],
  run(input, options): ToolResult {
    const expected = optionString(options, 'expected')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean);
    const report = validateEnv(assertInput(input, '.env content'), expected);
    if (report.count === 0) throw new ToolError('No KEY=value entries found.');
    const lines = [
      `Keys: ${report.count} entries, ${report.keys.length} unique`,
      `Issues: ${report.issues.length}`,
      '',
      ...(report.issues.length > 0
        ? report.issues.map(
            (issue) =>
              `${issue.level === 'error' ? '[ERROR]' : '[WARN] '} ${issue.line ? `line ${issue.line}: ` : ''}${issue.key ? `${issue.key}: ` : ''}${issue.message}`,
          )
        : ['No issues found.']),
      '',
      'Values are never printed by this report.',
    ];
    return {
      output: lines.join('\n'),
      meta: [
        { label: 'Keys', value: String(report.keys.length) },
        { label: 'Issues', value: String(report.issues.length) },
      ],
      warnings: report.issues.filter((issue) => issue.level === 'error').length
        ? ['Errors must be fixed before this env file is reliable.']
        : undefined,
    };
  },
  docs: {
    about:
      'Parses dotenv-style files, including export prefixes and single or double quotes, and reports problems without echoing values.',
    limitations: [
      'It checks syntax and obvious placeholders, not whether the values work.',
      'Multi-line quoted values and variable expansion are not supported.',
      'It cannot tell whether a secret has leaked; use a secret scanner for that.',
    ],
  },
};
