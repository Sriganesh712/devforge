import {
  assertInput,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

export interface GitCommitInput {
  sha: string;
  parents: string[];
  subject: string;
}

export interface GraphNode extends GitCommitInput {
  lane: number;
  row: number;
  head: boolean;
}

export interface GraphEdge {
  from: string;
  to: string;
  fromLane: number;
  toLane: number;
  fromRow: number;
  toRow: number;
}

export interface GraphLayout {
  nodes: GraphNode[];
  edges: GraphEdge[];
  lanes: number;
  missingParents: string[];
}

const SHA = /^[0-9a-f]{4,40}$/i;

export function parseGitLog(source: string): GitCommitInput[] {
  const commits: GitCommitInput[] = [];
  const lines = source.split(/\r?\n/);
  for (const [index, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line) continue;
    const first = line.indexOf('|');
    const second = line.indexOf('|', first + 1);
    if (first === -1 || second === -1) {
      throw new ToolError(
        `Line ${index + 1} does not match "sha|parents|subject". Run git log --all --pretty=format:"%h|%p|%s".`,
      );
    }
    const sha = line.slice(0, first).trim();
    const parentText = line.slice(first + 1, second).trim();
    const subject = line.slice(second + 1).trim();
    if (!SHA.test(sha)) {
      throw new ToolError(`Line ${index + 1}: "${sha}" is not a commit hash.`);
    }
    commits.push({
      sha,
      parents: parentText ? parentText.split(/\s+/).filter((parent) => SHA.test(parent)) : [],
      subject: subject || '(no subject)',
    });
  }
  if (commits.length === 0) throw new ToolError('No commits found in the log.');
  if (commits.length > 200) {
    throw new ToolError('Limit the log to 200 commits so the graph stays readable.');
  }
  return commits;
}

export function layoutGraph(commits: GitCommitInput[]): GraphLayout {
  const active: Array<string | null> = [];
  const nodes: GraphNode[] = [];
  const nodeBySha = new Map<string, GraphNode>();

  const allocate = (): number => {
    const free = active.indexOf(null);
    if (free !== -1) return free;
    active.push(null);
    return active.length - 1;
  };

  for (const [row, commit] of commits.entries()) {
    let lane = active.indexOf(commit.sha);
    if (lane === -1) lane = allocate();
    active[lane] = null;
    const node: GraphNode = { ...commit, lane, row, head: row === 0 };
    nodes.push(node);
    nodeBySha.set(commit.sha, node);
    const [firstParent, ...otherParents] = commit.parents;
    if (firstParent && !active.includes(firstParent)) {
      active[lane] = firstParent;
    }
    for (const parent of otherParents) {
      if (!active.includes(parent)) {
        const parentLane = allocate();
        active[parentLane] = parent;
      }
    }
  }

  const edges: GraphEdge[] = [];
  const missing = new Set<string>();
  for (const node of nodes) {
    for (const parent of node.parents) {
      const target = nodeBySha.get(parent);
      if (!target) {
        missing.add(parent);
        continue;
      }
      edges.push({
        from: node.sha,
        to: target.sha,
        fromLane: node.lane,
        toLane: target.lane,
        fromRow: node.row,
        toRow: target.row,
      });
    }
  }
  return {
    nodes,
    edges,
    lanes: Math.max(1, ...nodes.map((node) => node.lane + 1)),
    missingParents: [...missing],
  };
}

export const gitLogVisualizer: ToolDefinition = {
  id: 'git-log-visualizer',
  name: 'Git graph visualizer',
  summary: 'Turn a git log into a readable commit graph with lanes, merges and hashes.',
  category: 'git',
  version: '1.0.0',
  tags: ['git', 'log', 'graph', 'branches', 'merge'],
  aliases: ['git graph', 'commit graph', 'branch visualizer'],
  privacy: { locality: 'local', note: 'The log text is parsed in your browser. No repository is accessed.' },
  ui: 'git-graph',
  input: {
    label: 'git log output',
    sample: `f3a91c2|b7d20e4 c4a88f1|merge: add request history
b7d20e4|9e1b0a3|feat(api): persist request history
c4a88f1|9e1b0a3|docs: document history limits
9e1b0a3|7c2d5e6|fix(api): strip auth headers from history
7c2d5e6||chore: initial scaffold`,
    rows: 12,
  },
  run(input): ToolResult {
    const commits = parseGitLog(assertInput(input));
    const layout = layoutGraph(commits);
    const output = layout.nodes
      .map(
        (node) =>
          `${' '.repeat(node.lane * 2)}${node.head ? '*' : 'o'} ${node.sha.slice(0, 7)} ${node.subject}`,
      )
      .join('\n');
    return {
      output,
      meta: [
        { label: 'Commits', value: String(layout.nodes.length) },
        { label: 'Lanes', value: String(layout.lanes) },
      ],
      warnings:
        layout.missingParents.length > 0
          ? [`Parents outside this log: ${layout.missingParents.join(', ')}. Fetch more history for complete edges.`]
          : undefined,
    };
  },
  docs: {
    about:
      'Parses the exact output of git log --all --pretty=format:"%h|%p|%s" and computes lanes from parent relationships. The first row is treated as HEAD.',
    limitations: [
      'Only the commits you paste are shown; parents outside the log appear as missing edges.',
      'Up to 200 commits; long histories should be filtered by branch or date first.',
      'Lane placement is deterministic but may differ visually from git log --graph.',
    ],
  },
};

export interface RepoRef {
  owner: string;
  repo: string;
  htmlUrl: string;
  apiUrl: string;
}

export function parseRepoUrl(input: string): RepoRef {
  const value = input.trim();
  if (!value) throw new ToolError('Add a public GitHub repository URL.');
  let owner: string;
  let repo: string;
  const short = /^([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)$/.exec(value);
  if (short) {
    owner = short[1];
    repo = short[2];
  } else {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      throw new ToolError('Use a URL like https://github.com/owner/repo.');
    }
    if (url.protocol !== 'https:' || !['github.com', 'www.github.com'].includes(url.hostname)) {
      throw new ToolError('Only public github.com HTTPS URLs are supported.');
    }
    const [ownerPart, repoPart] = url.pathname.split('/').filter(Boolean);
    if (!ownerPart || !repoPart) throw new ToolError('The URL must include an owner and a repository.');
    owner = ownerPart;
    repo = repoPart.replace(/\.git$/, '');
  }
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(owner)) {
    throw new ToolError('That GitHub owner name looks invalid.');
  }
  if (!/^[A-Za-z0-9._-]{1,100}$/.test(repo) || repo === '.' || repo === '..') {
    throw new ToolError('That GitHub repository name looks invalid.');
  }
  return {
    owner,
    repo,
    htmlUrl: `https://github.com/${owner}/${repo}`,
    apiUrl: `https://api.github.com/repos/${owner}/${repo}`,
  };
}

export const githubExplorer: ToolDefinition = {
  id: 'github-explorer',
  name: 'GitHub repository explorer',
  summary: 'Inspect a public repository’s metadata, languages, root files and open issues.',
  category: 'git',
  version: '1.0.0',
  tags: ['github', 'repository', 'issues', 'api'],
  aliases: ['github repo', 'repository explorer'],
  privacy: {
    locality: 'browser-network',
    note: 'Your browser calls api.github.com directly. DevForge never proxies the request or stores a token.',
  },
  ui: 'github',
  input: {
    label: 'Repository',
    sample: 'https://github.com/vercel/next.js',
    rows: 2,
  },
  run(input): ToolResult {
    const ref = parseRepoUrl(assertInput(input));
    return {
      output: [
        `Repository: ${ref.owner}/${ref.repo}`,
        `API: ${ref.apiUrl}`,
        'Open the tool UI to load metadata from GitHub.',
      ].join('\n'),
      meta: [{ label: 'Repository', value: `${ref.owner}/${ref.repo}` }],
    };
  },
  docs: {
    about:
      'Uses the public GitHub REST API from the browser. Requests are unauthenticated unless you provide a token for that session.',
    limitations: [
      'Unauthenticated GitHub API requests are limited to 60 per hour per IP.',
      'Only public repositories and the root directory are inspected; file contents beyond the README are not analyzed.',
      'The optional token is held in memory for the current page only and is never persisted or logged.',
    ],
  },
};
