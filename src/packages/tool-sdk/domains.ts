export type CategoryKind = 'tools' | 'surface';

export interface DomainCategory {
  id: string;
  index: string;
  name: string;
  shortName: string;
  href: string;
  description: string;
  icon: string;
  kind: CategoryKind;
  /** Tool category ids that roll up into this domain. */
  toolCategories?: readonly string[];
  status: 'available' | 'partial';
  note?: string;
}

/** The 12 product domains. Tool domains map to tool categories; surfaces are full features. */
export const domains: readonly DomainCategory[] = [
  {
    id: 'code',
    index: '01',
    name: 'Code Utilities',
    shortName: 'Code',
    href: '/tools/code',
    description: 'Format, validate, diff and convert the text formats you touch every day.',
    icon: 'Braces',
    kind: 'tools',
    toolCategories: ['code'],
    status: 'available',
  },
  {
    id: 'git',
    index: '02',
    name: 'Git & GitHub',
    shortName: 'Git',
    href: '/tools/git',
    description: 'Understand commands, shape commit history and inspect public repositories.',
    icon: 'GitBranch',
    kind: 'tools',
    toolCategories: ['git'],
    status: 'available',
  },
  {
    id: 'api',
    index: '03',
    name: 'API Development',
    shortName: 'API',
    href: '/tools/api',
    description: 'Send real HTTP requests, convert cURL and generate API reference docs.',
    icon: 'Radio',
    kind: 'tools',
    toolCategories: ['api'],
    status: 'available',
  },
  {
    id: 'quality',
    index: '04',
    name: 'Code Quality',
    shortName: 'Quality',
    href: '/tools/quality',
    description: 'Heuristic complexity, duplicate-block and package.json analysis with honest limits.',
    icon: 'Gauge',
    kind: 'tools',
    toolCategories: ['quality'],
    status: 'available',
  },
  {
    id: 'ai',
    index: '05',
    name: 'AI Studio',
    shortName: 'AI Studio',
    href: '/ai',
    description: 'Optional, bring-your-own-key assistance. Every deterministic tool works without it.',
    icon: 'Sparkles',
    kind: 'surface',
    status: 'available',
    note: 'Cloud or local model, configured by you',
  },
  {
    id: 'database',
    index: '06',
    name: 'Database Studio',
    shortName: 'Database',
    href: '/tools/database',
    description: 'Format SQL, read connection strings safely and draw schemas from DDL.',
    icon: 'Database',
    kind: 'tools',
    toolCategories: ['database'],
    status: 'available',
  },
  {
    id: 'security',
    index: '07',
    name: 'Security Lab',
    shortName: 'Security',
    href: '/tools/security',
    description: 'Decode tokens, hash and verify, estimate strength and audit response headers.',
    icon: 'ShieldCheck',
    kind: 'tools',
    toolCategories: ['security'],
    status: 'available',
  },
  {
    id: 'devops',
    index: '08',
    name: 'DevOps & Cloud',
    shortName: 'DevOps',
    href: '/tools/devops',
    description: 'Generate Docker, Compose and Actions files, build cron schedules and check env files.',
    icon: 'Container',
    kind: 'tools',
    toolCategories: ['devops'],
    status: 'available',
  },
  {
    id: 'frontend',
    index: '09',
    name: 'Frontend Lab',
    shortName: 'Frontend',
    href: '/tools/frontend',
    description: 'Live CSS generators, color and contrast checks, sandboxed HTML and SVG cleanup.',
    icon: 'PanelsTopLeft',
    kind: 'tools',
    toolCategories: ['frontend'],
    status: 'available',
  },
  {
    id: 'backend',
    index: '10',
    name: 'Backend Lab',
    shortName: 'Backend',
    href: '/tools/backend',
    description: 'Look up status codes and MIME types, parse URLs and inspect raw headers.',
    icon: 'Server',
    kind: 'tools',
    toolCategories: ['backend'],
    status: 'available',
  },
  {
    id: 'workspace',
    index: '11',
    name: 'Developer Workspace',
    shortName: 'Workspace',
    href: '/workspace',
    description: 'Snippets, bookmarks, favorites and recent tools stored in this browser.',
    icon: 'Library',
    kind: 'surface',
    status: 'available',
    note: 'Local-first, no account required',
  },
  {
    id: 'plugins',
    index: '12',
    name: 'Plugin Ecosystem',
    shortName: 'Plugins',
    href: '/plugins',
    description: 'A validated manifest SDK, first-party registry and a reviewed submission path.',
    icon: 'Puzzle',
    kind: 'surface',
    status: 'partial',
    note: 'Manifests only; no third-party code execution',
  },
];

export function getDomain(id: string): DomainCategory | undefined {
  return domains.find((domain) => domain.id === id);
}
