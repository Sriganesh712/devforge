import { format } from 'sql-formatter';
import {
  assertInput,
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

export const sqlFormatter: ToolDefinition = {
  id: 'sql-formatter',
  name: 'SQL formatter',
  summary: 'Format SQL for PostgreSQL, MySQL, SQLite, T-SQL, BigQuery and more.',
  category: 'database',
  version: '1.0.0',
  tags: ['sql', 'format', 'postgres', 'mysql', 'database'],
  aliases: ['sql beautify', 'format query'],
  privacy: { locality: 'local', note: 'Queries are formatted in your browser.' },
  input: {
    label: 'SQL query',
    sample: `select u.id,u.email,count(p.id) as posts from users u left join posts p on p.user_id=u.id where u.active=true and u.created_at > now() - interval '30 days' group by u.id,u.email having count(p.id)>2 order by posts desc limit 20;`,
    rows: 10,
  },
  options: [
    {
      kind: 'select',
      id: 'dialect',
      label: 'Dialect',
      defaultValue: 'postgresql',
      choices: [
        { value: 'sql', label: 'Standard SQL' },
        { value: 'postgresql', label: 'PostgreSQL' },
        { value: 'mysql', label: 'MySQL' },
        { value: 'mariadb', label: 'MariaDB' },
        { value: 'sqlite', label: 'SQLite' },
        { value: 'transactsql', label: 'T-SQL' },
        { value: 'bigquery', label: 'BigQuery' },
        { value: 'snowflake', label: 'Snowflake' },
      ],
    },
    {
      kind: 'select',
      id: 'keywordCase',
      label: 'Keywords',
      defaultValue: 'upper',
      choices: [
        { value: 'upper', label: 'UPPERCASE' },
        { value: 'lower', label: 'lowercase' },
        { value: 'preserve', label: 'Preserve' },
      ],
    },
  ],
  run(input, options): ToolResult {
    const source = assertInput(input);
    const dialect = optionString(options, 'dialect', 'postgresql');
    const keywordCase = optionString(options, 'keywordCase', 'upper') as
      | 'upper'
      | 'lower'
      | 'preserve';
    try {
      const output = format(source, {
        language: dialect as Parameters<typeof format>[1] extends { language?: infer L } ? L : never,
        keywordCase,
        tabWidth: 2,
        linesBetweenQueries: 1,
      });
      return {
        output,
        language: 'sql',
        meta: [
          { label: 'Dialect', value: dialect },
          { label: 'Lines', value: String(output.split('\n').length) },
        ],
      };
    } catch (error) {
      throw new ToolError(
        `Could not format this SQL: ${error instanceof Error ? error.message : 'unexpected parse error'}`,
      );
    }
  },
  docs: {
    about:
      'Uses sql-formatter, which tokenizes SQL and reprints it. Formatting does not execute or validate the query against a database.',
    limitations: [
      'Vendor-specific syntax not supported by the chosen dialect may fail to format.',
      'Formatting is cosmetic; it does not check tables, permissions or query plans.',
    ],
  },
};

const DEFAULT_PORTS: Record<string, string> = {
  postgres: '5432',
  postgresql: '5432',
  mysql: '3306',
  mariadb: '3306',
  mongodb: '27017',
  'mongodb+srv': '27017',
  redis: '6379',
  rediss: '6379',
  amqp: '5672',
  amqps: '5671',
  mssql: '1433',
};

const SECRET_PARAMS = /pass|secret|token|key|credential|auth/i;

export interface ConnectionInfo {
  scheme: string;
  username: string;
  hasPassword: boolean;
  host: string;
  port: string;
  database: string;
  params: Array<{ key: string; value: string; secret: boolean }>;
  sanitized: string;
  warnings: string[];
}

export function parseConnectionString(source: string): ConnectionInfo {
  let url: URL;
  try {
    url = new URL(source.trim());
  } catch {
    throw new ToolError(
      'Could not parse that connection string. Use a URL such as postgresql://user:pass@host:5432/db.',
    );
  }
  const scheme = url.protocol.replace(':', '').toLowerCase();
  if (!DEFAULT_PORTS[scheme]) {
    throw new ToolError(
      `Unsupported scheme "${scheme}". Supported: ${Object.keys(DEFAULT_PORTS).join(', ')}.`,
    );
  }
  const warnings: string[] = [];
  if (url.password) {
    warnings.push('The password is present in the URL. Avoid pasting production credentials into logs or tickets.');
  }
  if (!url.hostname) warnings.push('No host found.');
  if (!url.pathname || url.pathname === '/') warnings.push('No database name in the path.');
  const params: Array<{ key: string; value: string; secret: boolean }> = [];
  url.searchParams.forEach((value, key) => {
    params.push({ key, value, secret: SECRET_PARAMS.test(key) });
  });
  if (params.some((param) => param.key.toLowerCase() === 'sslmode' && /disable|allow/i.test(param.value))) {
    warnings.push('sslmode disables or weakens TLS. Use require or verify-full for remote databases.');
  }
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    warnings.push('Local host: make sure this connection string is not meant for a deployed environment.');
  }
  const sanitizedParams = new URLSearchParams();
  for (const param of params) {
    sanitizedParams.set(param.key, param.secret ? '[redacted]' : param.value);
  }
  const sanitized = `${scheme}://${url.username ? `${encodeURIComponent(url.username)}${url.password ? ':[redacted]' : ''}@` : ''}${url.hostname}${url.port ? `:${url.port}` : ''}${url.pathname}${sanitizedParams.toString() ? `?${sanitizedParams.toString()}` : ''}`;
  return {
    scheme,
    username: url.username ? decodeURIComponent(url.username) : '',
    hasPassword: Boolean(url.password),
    host: url.hostname,
    port: url.port || DEFAULT_PORTS[scheme],
    database: decodeURIComponent(url.pathname.replace(/^\//, '')),
    params,
    sanitized,
    warnings,
  };
}

export const connectionParser: ToolDefinition = {
  id: 'connection-string-parser',
  name: 'Connection string parser',
  summary: 'Read a database connection URL and produce a redacted summary with warnings.',
  category: 'database',
  version: '1.0.0',
  tags: ['database', 'connection', 'postgres', 'mysql', 'redis', 'security'],
  aliases: ['database url parser', 'connection string'],
  privacy: { locality: 'local', note: 'Parsed in your browser. Nothing connects to the database.' },
  input: {
    label: 'Connection string',
    sample: 'postgresql://forge:demo-password@db.internal:5432/devforge?sslmode=require&application_name=devforge',
    rows: 3,
  },
  run(input): ToolResult {
    const info = parseConnectionString(assertInput(input));
    const output = [
      `Scheme: ${info.scheme}`,
      `Host: ${info.host}`,
      `Port: ${info.port}`,
      `Database: ${info.database || '(none)'}`,
      `Username: ${info.username || '(none)'}`,
      `Password: ${info.hasPassword ? 'present (redacted)' : 'not present'}`,
      '',
      'Parameters',
      ...(info.params.length > 0
        ? info.params.map((param) => `  ${param.key}: ${param.secret ? '[redacted]' : param.value}`)
        : ['  none']),
      '',
      'Sanitized connection string',
      info.sanitized,
    ].join('\n');
    return {
      output,
      meta: [
        { label: 'Scheme', value: info.scheme },
        { label: 'Port', value: info.port },
      ],
      warnings: info.warnings,
    };
  },
  docs: {
    about:
      'Parses URL-style connection strings and redacts passwords and secret-looking query parameters in the report.',
    limitations: [
      'ADO.NET style "Server=...;Database=..." strings are not supported.',
      'No connection is attempted; reachability and credentials are not verified.',
    ],
  },
};
