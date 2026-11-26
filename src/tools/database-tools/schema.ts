import {
  assertInput,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  references?: { table: string; column?: string };
}

export interface SchemaTable {
  name: string;
  columns: SchemaColumn[];
}

export interface SchemaRelation {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn?: string;
}

export interface ParsedSchema {
  tables: SchemaTable[];
  relations: SchemaRelation[];
  warnings: string[];
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('`') && trimmed.endsWith('`'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function shortName(value: string): string {
  const cleaned = unquote(value);
  return cleaned.split('.').pop() ?? cleaned;
}

function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote: string | null = null;
  for (const char of body) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      current += char;
      continue;
    }
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function findClosingParen(source: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '(') depth += 1;
    else if (char === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

const CONSTRAINT_START = /\s+(?:NOT\s+NULL|NULL|PRIMARY\s+KEY|REFERENCES|UNIQUE|DEFAULT|CHECK|COLLATE|GENERATED|CONSTRAINT)\b/i;

export function parseSqlSchema(source: string): ParsedSchema {
  const withoutComments = source.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const tables: SchemaTable[] = [];
  const relations: SchemaRelation[] = [];
  const warnings: string[] = [];
  const createPattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(["`]?[\w.]+["`]?)\s*\(/gi;
  let match: RegExpExecArray | null;
  while ((match = createPattern.exec(withoutComments)) !== null) {
    const open = withoutComments.indexOf('(', match.index + match[0].length - 1);
    const close = findClosingParen(withoutComments, open);
    if (close === -1) {
      warnings.push(`Could not find the closing parenthesis for ${shortName(match[1])}.`);
      continue;
    }
    const name = shortName(match[1]);
    const body = withoutComments.slice(open + 1, close);
    const columns: SchemaColumn[] = [];
    for (const part of splitTopLevel(body)) {
      if (!part) continue;
      const tablePrimary = /^(?:CONSTRAINT\s+\S+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i.exec(part);
      if (tablePrimary) {
        for (const column of tablePrimary[1].split(',').map((entry) => shortName(entry))) {
          const target = columns.find((entry) => entry.name.toLowerCase() === column.toLowerCase());
          if (target) target.primaryKey = true;
        }
        continue;
      }
      const tableForeign =
        /^(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(["`]?[\w.]+["`]?)\s*(?:\(([^)]+)\))?/i.exec(
          part,
        );
      if (tableForeign) {
        const fromColumns = tableForeign[1].split(',').map((entry) => unquote(entry));
        const toTable = shortName(tableForeign[2]);
        const toColumns = tableForeign[3]?.split(',').map((entry) => unquote(entry)) ?? [];
        fromColumns.forEach((fromColumn, index) => {
          relations.push({
            fromTable: name,
            fromColumn,
            toTable,
            toColumn: toColumns[index],
          });
        });
        continue;
      }
      if (/^(?:CONSTRAINT\b|UNIQUE\b|CHECK\b|KEY\b|INDEX\b)/i.test(part)) continue;

      const nameMatch = /^(["`]?[\w$]+["`]?)\s+(.+)$/.exec(part);
      if (!nameMatch) {
        warnings.push(`Skipped an unreadable definition in ${name}: ${part.slice(0, 60)}`);
        continue;
      }
      const columnName = unquote(nameMatch[1]);
      const rest = nameMatch[2];
      const constraintIndex = rest.search(CONSTRAINT_START);
      const type = (constraintIndex === -1 ? rest : rest.slice(0, constraintIndex)).trim();
      const constraints = constraintIndex === -1 ? '' : rest.slice(constraintIndex);
      const references = /REFERENCES\s+(["`]?[\w.]+["`]?)\s*(?:\(([^)]+)\))?/i.exec(constraints);
      const primaryKey = /PRIMARY\s+KEY/i.test(constraints);
      const column: SchemaColumn = {
        name: columnName,
        type: type || 'unknown',
        nullable: !primaryKey && !/NOT\s+NULL/i.test(constraints),
        primaryKey,
      };
      if (references) {
        column.references = {
          table: shortName(references[1]),
          column: references[2] ? unquote(references[2].split(',')[0]) : undefined,
        };
        relations.push({
          fromTable: name,
          fromColumn: columnName,
          toTable: column.references.table,
          toColumn: column.references.column,
        });
      }
      columns.push(column);
    }
    if (columns.length === 0) {
      warnings.push(`Table ${name} has no parsed columns.`);
    }
    tables.push({ name, columns });
  }
  if (tables.length === 0) {
    throw new ToolError('No CREATE TABLE statements found. Paste SQL DDL to draw a schema.');
  }
  const names = new Set(tables.map((table) => table.name.toLowerCase()));
  const missing = [...new Set(relations.map((relation) => relation.toTable))].filter(
    (table) => !names.has(table.toLowerCase()),
  );
  if (missing.length > 0) {
    warnings.push(`Referenced tables not defined here: ${missing.join(', ')}.`);
  }
  return { tables, relations, warnings };
}

export const schemaVisualizer: ToolDefinition = {
  id: 'schema-visualizer',
  name: 'SQL schema visualizer',
  summary: 'Draw tables and foreign-key relationships from CREATE TABLE statements.',
  category: 'database',
  version: '1.0.0',
  tags: ['sql', 'schema', 'er diagram', 'database', 'ddl'],
  aliases: ['er diagram', 'database diagram', 'ddl visualizer'],
  privacy: { locality: 'local', note: 'DDL is parsed in your browser. No database is contacted.' },
  ui: 'schema',
  input: {
    label: 'SQL DDL',
    sample: `CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id BIGSERIAL PRIMARY KEY,
  owner_id BIGINT NOT NULL REFERENCES users(id),
  name VARCHAR(120) NOT NULL,
  archived BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE tasks (
  id BIGSERIAL PRIMARY KEY,
  project_id BIGINT NOT NULL,
  assignee_id BIGINT REFERENCES users(id),
  title TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  FOREIGN KEY (project_id) REFERENCES projects(id)
);`,
    rows: 20,
  },
  run(input): ToolResult {
    const schema = parseSqlSchema(assertInput(input, 'DDL'));
    const lines = [
      `Tables: ${schema.tables.length}`,
      `Relationships: ${schema.relations.length}`,
      '',
      ...schema.tables.map(
        (table) =>
          `${table.name} (${table.columns.length} columns)\n${table.columns
            .map(
              (column) =>
                `  ${column.primaryKey ? 'PK' : column.references ? 'FK' : '  '} ${column.name} ${column.type}${column.nullable ? '' : ' NOT NULL'}`,
            )
            .join('\n')}`,
      ),
      '',
      'Relationships',
      ...(schema.relations.length > 0
        ? schema.relations.map(
            (relation) =>
              `  ${relation.fromTable}.${relation.fromColumn} → ${relation.toTable}${relation.toColumn ? `.${relation.toColumn}` : ''}`,
          )
        : ['  none']),
    ];
    return {
      output: lines.join('\n'),
      meta: [
        { label: 'Tables', value: String(schema.tables.length) },
        { label: 'Relations', value: String(schema.relations.length) },
      ],
      warnings: schema.warnings,
    };
  },
  docs: {
    about:
      'Parses CREATE TABLE definitions, column types, primary keys and inline or table-level foreign keys, then lays tables out by dependency.',
    limitations: [
      'A focused DDL parser, not a full SQL engine. ALTER TABLE, views and composite key display are not visualized.',
      'Schema-qualified names are shortened to the final segment.',
      'No database is contacted and no data is read.',
    ],
  },
};
