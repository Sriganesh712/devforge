import {
  assertInput,
  optionBoolean,
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

function id(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `evt_${Date.now().toString(36)}`;
}

function iso(): string {
  return new Date().toISOString();
}

function githubPayload(event: string): { payload: unknown; headers: Record<string, string> } {
  const now = iso();
  const baseHeaders = {
    'X-GitHub-Event': event,
    'X-GitHub-Delivery': id(),
    'Content-Type': 'application/json',
  };
  const repository = {
    id: 824551,
    node_id: 'R_kgDODemo',
    name: 'devforge',
    full_name: 'example/devforge',
    private: false,
    owner: { login: 'example', id: 1284, type: 'User' },
    html_url: 'https://github.com/example/devforge',
    default_branch: 'main',
  };
  if (event === 'pull_request') {
    return {
      headers: baseHeaders,
      payload: {
        action: 'opened',
        number: 42,
        pull_request: {
          id: 1904,
          number: 42,
          state: 'open',
          title: 'Add request history to the API builder',
          user: { login: 'contributor', id: 9031 },
          body: 'Persists the last 20 requests locally and redacts auth headers.',
          head: { ref: 'feat/request-history', sha: 'f3a91c2b7d20e4c4a88f19e1b0a37c2d5e6' },
          base: { ref: 'main', sha: '9e1b0a37c2d5e67c2d5e67c2d5e67c2d5e67c2d5' },
          merged: false,
          html_url: 'https://github.com/example/devforge/pull/42',
          created_at: now,
        },
        repository,
        sender: { login: 'contributor', id: 9031 },
      },
    };
  }
  if (event === 'issues') {
    return {
      headers: baseHeaders,
      payload: {
        action: 'opened',
        issue: {
          id: 5512,
          number: 118,
          title: 'Document the plugin manifest permissions',
          state: 'open',
          user: { login: 'maintainer', id: 442 },
          labels: [{ name: 'documentation', color: 'd9a441' }],
          html_url: 'https://github.com/example/devforge/issues/118',
          created_at: now,
        },
        repository,
        sender: { login: 'maintainer', id: 442 },
      },
    };
  }
  return {
    headers: baseHeaders,
    payload: {
      ref: 'refs/heads/main',
      before: '7c2d5e69e1b0a37c2d5e67c2d5e67c2d5e67c2d5',
      after: 'f3a91c2b7d20e4c4a88f19e1b0a37c2d5e6',
      created: false,
      deleted: false,
      forced: false,
      repository,
      pusher: { name: 'maintainer', email: 'maintainer@example.dev' },
      commits: [
        {
          id: 'f3a91c2b7d20e4c4a88f19e1b0a37c2d5e6',
          message: 'feat(api): add request history',
          timestamp: now,
          author: { name: 'Maintainer', email: 'maintainer@example.dev' },
          added: ['src/features/api-client.tsx'],
          removed: [],
          modified: ['docs/CHANGELOG.md'],
        },
      ],
    },
  };
}

function stripePayload(event: string): { payload: unknown; headers: Record<string, string> } {
  const headers = {
    'Stripe-Signature': 't=1732612800,v1=0000000000000000000000000000000000000000000000000000000000000000',
    'Content-Type': 'application/json',
  };
  if (event === 'invoice.payment_failed') {
    return {
      headers,
      payload: {
        id: `evt_${id().replace(/-/g, '').slice(0, 24)}`,
        object: 'event',
        api_version: '2026-01-01',
        created: Math.floor(Date.now() / 1000),
        type: event,
        data: {
          object: {
            id: 'in_demo_1042',
            object: 'invoice',
            customer: 'cus_demo_8842',
            amount_due: 2400,
            amount_paid: 0,
            currency: 'usd',
            status: 'open',
            attempt_count: 2,
            next_payment_attempt: Math.floor(Date.now() / 1000) + 86400,
          },
        },
        livemode: false,
        request: { id: null, idempotency_key: null },
      },
    };
  }
  return {
    headers,
    payload: {
      id: `evt_${id().replace(/-/g, '').slice(0, 24)}`,
      object: 'event',
      api_version: '2026-01-01',
      created: Math.floor(Date.now() / 1000),
      type: event || 'invoice.paid',
      data: {
        object: {
          id: 'in_demo_1042',
          object: 'invoice',
          customer: 'cus_demo_8842',
          amount_due: 2400,
          amount_paid: 2400,
          currency: 'usd',
          status: 'paid',
          paid: true,
          invoice_pdf: 'https://pay.example.dev/invoices/in_demo_1042.pdf',
          lines: {
            object: 'list',
            data: [{ description: 'DevForge Team, monthly', amount: 2400, currency: 'usd', quantity: 1 }],
          },
        },
      },
      livemode: false,
      request: { id: null, idempotency_key: null },
    },
  };
}

function gitlabPayload(event: string): { payload: unknown; headers: Record<string, string> } {
  const headers = { 'X-Gitlab-Event': event || 'Push Hook', 'Content-Type': 'application/json' };
  return {
    headers,
    payload: {
      object_kind: event || 'push',
      event_name: event || 'push',
      before: '7c2d5e69e1b0a37c2d5e67c2d5e67c2d5e67c2d5',
      after: 'f3a91c2b7d20e4c4a88f19e1b0a37c2d5e6',
      ref: 'refs/heads/main',
      user_name: 'Maintainer',
      project: {
        id: 4412,
        name: 'devforge',
        path_with_namespace: 'example/devforge',
        web_url: 'https://gitlab.com/example/devforge',
        default_branch: 'main',
      },
      commits: [
        {
          id: 'f3a91c2b7d20e4c4a88f19e1b0a37c2d5e6',
          message: 'feat(api): add request history',
          timestamp: iso(),
          author: { name: 'Maintainer', email: 'maintainer@example.dev' },
          added: ['src/features/api-client.tsx'],
          modified: ['docs/CHANGELOG.md'],
          removed: [],
        },
      ],
      total_commits_count: 1,
    },
  };
}

export const webhookGenerator: ToolDefinition = {
  id: 'webhook-generator',
  name: 'Webhook payload generator',
  summary: 'Generate realistic GitHub, GitLab, Stripe or generic webhook bodies for local tests.',
  category: 'api',
  version: '1.0.0',
  tags: ['webhook', 'github', 'gitlab', 'stripe', 'fixture'],
  aliases: ['webhook payload', 'webhook test'],
  privacy: { locality: 'local', note: 'Generated in your browser. Nothing is sent.' },
  input: {
    label: 'Event name',
    sample: 'pull_request',
    rows: 2,
  },
  options: [
    {
      kind: 'select',
      id: 'provider',
      label: 'Provider',
      defaultValue: 'github',
      choices: [
        { value: 'github', label: 'GitHub' },
        { value: 'gitlab', label: 'GitLab' },
        { value: 'stripe', label: 'Stripe' },
        { value: 'generic', label: 'Generic' },
      ],
    },
    { kind: 'toggle', id: 'headers', label: 'Show delivery headers', defaultValue: false },
  ],
  run(input, options): ToolResult {
    const event = assertInput(input, 'Event name').trim().toLowerCase();
    const provider = optionString(options, 'provider', 'github');
    const showHeaders = optionBoolean(options, 'headers');
    let result: { payload: unknown; headers: Record<string, string> };
    if (provider === 'github') result = githubPayload(event);
    else if (provider === 'gitlab') result = gitlabPayload(event);
    else if (provider === 'stripe') result = stripePayload(event);
    else {
      result = {
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Event': event },
        payload: {
          id: id(),
          event,
          createdAt: iso(),
          data: { resource: 'example', status: 'succeeded', metadata: { environment: 'local' } },
        },
      };
    }
    const output = showHeaders
      ? [
          '# Delivery headers',
          ...Object.entries(result.headers).map(([key, value]) => `${key}: ${value}`),
          '',
          '# Body',
          JSON.stringify(result.payload, null, 2),
        ].join('\n')
      : JSON.stringify(result.payload, null, 2);
    return {
      output,
      language: 'json',
      meta: [
        { label: 'Provider', value: provider },
        { label: 'Event', value: event },
      ],
      warnings: [
        'Payload values are synthetic fixtures. Signature headers are placeholders and will not verify.',
      ],
    };
  },
  docs: {
    about:
      'Produces structurally plausible fixtures for local webhook handlers. Timestamps and delivery IDs are generated at run time.',
    limitations: [
      'These are fixtures, not captured production events; provider schemas change over time.',
      'Signature headers are fake and cannot be used to test signature verification.',
    ],
  },
};

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options', 'trace'] as const;

function escapeCell(value: unknown): string {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function schemaLabel(schema: unknown): string {
  if (!schema || typeof schema !== 'object') return 'any';
  const value = schema as Record<string, unknown>;
  if (typeof value.$ref === 'string') return value.$ref.split('/').pop() ?? value.$ref;
  if (Array.isArray(value.enum)) return `enum(${value.enum.map(String).join(', ')})`;
  if (value.type === 'array') return `${schemaLabel(value.items)}[]`;
  if (value.type) return String(value.type);
  if (value.oneOf) return 'oneOf';
  if (value.anyOf) return 'anyOf';
  return 'object';
}

export const apiDocsGenerator: ToolDefinition = {
  id: 'api-docs-generator',
  name: 'API docs generator',
  summary: 'Turn an OpenAPI 3 or Swagger 2 document into a readable Markdown reference.',
  category: 'api',
  version: '1.0.0',
  tags: ['openapi', 'swagger', 'markdown', 'documentation'],
  aliases: ['openapi to markdown', 'swagger docs'],
  privacy: { locality: 'local', note: 'The spec is parsed in your browser.' },
  input: {
    label: 'OpenAPI JSON',
    sample: `{"openapi":"3.0.3","info":{"title":"Tasks API","version":"1.2.0","description":"A small task service."},"servers":[{"url":"https://api.example.dev/v1"}],"paths":{"/tasks":{"get":{"summary":"List tasks","parameters":[{"name":"status","in":"query","schema":{"type":"string","enum":["open","done"]}}],"responses":{"200":{"description":"A list of tasks"},"401":{"description":"Missing token"}}}},"/tasks/{id}":{"delete":{"summary":"Delete a task","parameters":[{"name":"id","in":"path","required":true,"schema":{"type":"string"}}],"responses":{"204":{"description":"Deleted"}}}}}}`,
    rows: 12,
  },
  options: [
    {
      kind: 'select',
      id: 'heading',
      label: 'Title source',
      defaultValue: 'spec',
      choices: [
        { value: 'spec', label: 'From the spec' },
        { value: 'h1', label: 'Simple # heading' },
      ],
    },
  ],
  run(input, options): ToolResult {
    let doc: Record<string, unknown>;
    try {
      doc = JSON.parse(assertInput(input)) as Record<string, unknown>;
    } catch (error) {
      throw new ToolError(
        `The OpenAPI document is not valid JSON: ${error instanceof Error ? error.message : 'parse error'}`,
      );
    }
    const info = (doc.info ?? {}) as Record<string, unknown>;
    const paths = doc.paths as Record<string, Record<string, unknown>> | undefined;
    if (!paths || typeof paths !== 'object') {
      throw new ToolError('No paths object found. Is this an OpenAPI or Swagger document?');
    }
    const servers = Array.isArray(doc.servers) ? (doc.servers as Array<Record<string, unknown>>) : [];
    const base =
      (servers[0]?.url as string | undefined) ??
      (doc.host ? `https://${doc.host}${(doc.basePath as string) ?? ''}` : undefined);
    const heading = optionString(options, 'heading', 'spec');
    const title = String(info.title ?? 'API reference');
    const lines: string[] = [];
    lines.push(heading === 'spec' ? `# ${title}` : '# API reference');
    if (info.version) lines.push('', `Version ${info.version}`);
    if (info.description) lines.push('', String(info.description));
    if (base) lines.push('', `Base URL: \`${base}\``);
    lines.push('', '> Generated from an OpenAPI document by DevForge.');

    let operations = 0;
    const pathKeys = Object.keys(paths).sort();
    for (const path of pathKeys) {
      const item = paths[path];
      if (!item || typeof item !== 'object') continue;
      for (const method of METHODS) {
        const operation = item[method] as Record<string, unknown> | undefined;
        if (!operation) continue;
        operations += 1;
        lines.push('', `## ${method.toUpperCase()} ${path}`);
        if (operation.summary) lines.push('', String(operation.summary));
        if (operation.description) lines.push('', String(operation.description));
        if (operation.operationId) lines.push('', `Operation ID: \`${operation.operationId}\``);
        const parameters = Array.isArray(operation.parameters)
          ? (operation.parameters as Array<Record<string, unknown>>)
          : [];
        if (parameters.length > 0) {
          lines.push('', '### Parameters', '', '| Name | In | Required | Type | Description |', '| --- | --- | --- | --- | --- |');
          for (const parameter of parameters) {
            lines.push(
              `| ${escapeCell(parameter.name)} | ${escapeCell(parameter.in)} | ${parameter.required ? 'yes' : 'no'} | ${escapeCell(schemaLabel(parameter.schema))} | ${escapeCell(parameter.description)} |`,
            );
          }
        }
        const requestBody = operation.requestBody as Record<string, unknown> | undefined;
        if (requestBody) {
          const content = (requestBody.content ?? {}) as Record<string, Record<string, unknown>>;
          const mediaType = Object.keys(content)[0];
          if (mediaType) {
            lines.push('', `### Request body`, '', `Content type: \`${mediaType}\``, '', `Schema: \`${schemaLabel(content[mediaType]?.schema)}\``);
          }
        }
        const responses = (operation.responses ?? {}) as Record<string, Record<string, unknown>>;
        const statuses = Object.keys(responses).sort();
        if (statuses.length > 0) {
          lines.push('', '### Responses', '', '| Status | Description |', '| --- | --- |');
          for (const status of statuses) {
            lines.push(`| ${escapeCell(status)} | ${escapeCell(responses[status]?.description)} |`);
          }
        }
      }
    }
    if (operations === 0) throw new ToolError('The document contains no HTTP operations.');
    if (operations > 300) throw new ToolError('This document has more than 300 operations; split it before generating.');
    return {
      output: lines.join('\n'),
      language: 'markdown',
      meta: [
        { label: 'Operations', value: String(operations) },
        { label: 'Paths', value: String(pathKeys.length) },
      ],
      warnings: doc.openapi ? undefined : ['No openapi field found; Swagger 2 is handled best-effort.'],
    };
  },
  docs: {
    about:
      'Reads OpenAPI 3 paths, parameters, request bodies and responses. Swagger 2 host/basePath is supported as a fallback.',
    limitations: [
      '$ref schemas are shown by name; components are not expanded.',
      'Markdown output is a reference, not a full interactive API portal.',
      'Documents with more than 300 operations are rejected.',
    ],
  },
};
