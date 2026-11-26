import {
  assertInput,
  optionBoolean,
  optionString,
  ToolError,
  type ToolDefinition,
  type ToolResult,
} from '@/packages/tool-sdk/types';

interface CommandDoc {
  summary: string;
  flags?: Record<string, string>;
  caution?: string;
  safer?: string;
}

const commands: Record<string, CommandDoc> = {
  init: { summary: 'Create a new Git repository in the current directory.' },
  clone: {
    summary: 'Copy a remote repository and check out its default branch.',
    flags: {
      '--depth': 'Create a shallow clone with limited history.',
      '--branch': 'Check out a specific branch instead of the default.',
      '--recurse-submodules': 'Initialize and clone submodules.',
    },
  },
  status: {
    summary: 'Show the working tree and staging area compared with HEAD.',
    flags: {
      '-s': 'Short format, one line per path.',
      '--short': 'Short format, one line per path.',
      '-b': 'Include branch and tracking information.',
    },
  },
  add: {
    summary: 'Stage file changes for the next commit.',
    flags: {
      '-A': 'Stage all changes, including deletions.',
      '--all': 'Stage all changes, including deletions.',
      '-p': 'Interactively choose hunks to stage.',
      '--patch': 'Interactively choose hunks to stage.',
      '-u': 'Stage modifications and deletions, but not new files.',
    },
  },
  commit: {
    summary: 'Record staged changes as a new commit.',
    flags: {
      '-m': 'Use the following argument as the commit message.',
      '-a': 'Stage tracked modified files before committing.',
      '--amend': 'Replace the previous commit instead of adding a new one.',
      '--no-edit': 'Keep the existing message when amending.',
      '--allow-empty': 'Create a commit with no changes.',
    },
    caution: '--amend rewrites the last commit. Do not amend commits that others have pulled.',
  },
  push: {
    summary: 'Upload local commits to a remote branch.',
    flags: {
      '-u': 'Set the upstream tracking branch.',
      '--set-upstream': 'Set the upstream tracking branch.',
      '--force-with-lease': 'Force push only if the remote still matches your last fetch.',
      '--force': 'Overwrite the remote branch regardless of others’ work.',
      '--tags': 'Push tags as well.',
    },
    caution:
      '--force can erase commits other people pushed. Prefer --force-with-lease, and never force push a shared main branch.',
    safer: 'git push --force-with-lease',
  },
  pull: {
    summary: 'Fetch remote changes and integrate them into the current branch.',
    flags: {
      '--rebase': 'Reapply local commits on top of the fetched branch instead of merging.',
      '--ff-only': 'Refuse to pull unless the merge can fast-forward.',
    },
  },
  fetch: {
    summary: 'Download remote objects and refs without changing your working tree.',
    flags: { '--prune': 'Delete remote-tracking refs that no longer exist on the remote.' },
  },
  merge: {
    summary: 'Join another branch’s history into the current branch.',
    flags: {
      '--no-ff': 'Always create a merge commit.',
      '--squash': 'Combine the changes into one set of staged changes without a merge commit.',
      '--abort': 'Abort an in-progress merge and restore the previous state.',
    },
  },
  rebase: {
    summary: 'Replay commits from one branch onto another base.',
    flags: {
      '-i': 'Interactive rebase: reorder, squash, edit or drop commits.',
      '--interactive': 'Interactive rebase.',
      '--onto': 'Rebase onto a specific base.',
      '--abort': 'Abort the rebase and restore the original branch.',
      '--continue': 'Continue after resolving conflicts.',
    },
    caution:
      'Rebase rewrites commit hashes. Avoid rebasing branches that other people share unless the team agrees.',
  },
  reset: {
    summary: 'Move the current branch pointer and optionally the index or working tree.',
    flags: {
      '--soft': 'Move HEAD only; keep changes staged.',
      '--mixed': 'Move HEAD and unstage changes; keep the working tree.',
      '--hard': 'Move HEAD and discard staged and unstaged changes.',
    },
    caution: '--hard permanently discards uncommitted work. Commit or stash first.',
  },
  revert: {
    summary: 'Create a new commit that undoes a previous commit without rewriting history.',
    flags: { '--no-edit': 'Use the generated revert message without opening an editor.' },
  },
  checkout: {
    summary: 'Switch branches or restore files from a commit.',
    flags: {
      '-b': 'Create a new branch and switch to it.',
      '--': 'Separate paths from branch names.',
    },
    caution: 'Checking out a file discards uncommitted changes to that file.',
    safer: 'git switch <branch> for branches, git restore <path> for files',
  },
  switch: {
    summary: 'Switch branches (the focused replacement for branch checkout).',
    flags: {
      '-c': 'Create a new branch and switch to it.',
      '--create': 'Create a new branch and switch to it.',
      '--detach': 'Detach HEAD at a commit.',
    },
  },
  restore: {
    summary: 'Restore working tree files or unstage changes.',
    flags: {
      '--staged': 'Restore the index instead of the working tree.',
      '--source': 'Restore from a specific commit.',
    },
    caution: 'Restoring the working tree discards local edits to those paths.',
  },
  branch: {
    summary: 'List, create, rename or delete branches.',
    flags: {
      '-a': 'List local and remote-tracking branches.',
      '-d': 'Delete a merged branch.',
      '-D': 'Force-delete a branch even if it is not merged.',
      '-m': 'Rename a branch.',
    },
    caution: '-D can delete unmerged work. Verify with git log before forcing.',
  },
  log: {
    summary: 'Show commit history.',
    flags: {
      '--oneline': 'One line per commit.',
      '--graph': 'Draw an ASCII graph of branch and merge history.',
      '--all': 'Include all refs, not just the current branch.',
      '--pretty': 'Choose a custom output format.',
      '-p': 'Show the patch for each commit.',
    },
  },
  diff: {
    summary: 'Show changes between commits, the index and the working tree.',
    flags: {
      '--staged': 'Compare the index with HEAD.',
      '--cached': 'Compare the index with HEAD.',
      '--stat': 'Show a summary of changed files.',
      '--word-diff': 'Show word-level changes.',
    },
  },
  stash: {
    summary: 'Temporarily save uncommitted changes and restore a clean working tree.',
    flags: {
      push: 'Save the current changes (default).',
      pop: 'Apply the latest stash and remove it from the stash list.',
      apply: 'Apply a stash but keep it in the list.',
      list: 'List stash entries.',
      drop: 'Delete a stash entry.',
    },
    caution: 'stash drop deletes the saved changes. Apply and verify before dropping.',
  },
  tag: {
    summary: 'Create, list or delete tags that point at commits.',
    flags: {
      '-a': 'Create an annotated tag.',
      '-d': 'Delete a tag.',
      '-l': 'List tags.',
    },
  },
  remote: {
    summary: 'Manage the set of remote repositories.',
    flags: {
      '-v': 'Show remote URLs.',
      'add': 'Add a remote.',
      'remove': 'Remove a remote.',
      'set-url': 'Change a remote URL.',
    },
  },
  'cherry-pick': {
    summary: 'Apply the changes from specific commits onto the current branch.',
    flags: { '--abort': 'Abort and restore the previous state.', '--continue': 'Continue after conflicts.' },
    caution: 'Cherry-picking creates new commits; the original commits remain in history.',
  },
  bisect: {
    summary: 'Binary search through history to find the commit that introduced a bug.',
    flags: {
      start: 'Begin a bisect session.',
      good: 'Mark the current commit as good.',
      bad: 'Mark the current commit as bad.',
      reset: 'End the session and return to the original branch.',
    },
  },
  reflog: {
    summary: 'Show where HEAD and branches have pointed recently.',
    flags: { '--all': 'Include all refs.' },
  },
  clean: {
    summary: 'Remove untracked files from the working tree.',
    flags: {
      '-n': 'Dry run: list what would be removed.',
      '--dry-run': 'Dry run: list what would be removed.',
      '-f': 'Force removal (required).',
      '-d': 'Include untracked directories.',
      '-x': 'Include ignored files as well.',
    },
    caution: 'clean -fdx permanently deletes untracked and ignored files. Run with -n first.',
  },
  config: {
    summary: 'Read or write Git configuration values.',
    flags: { '--global': 'Use the user-level config file.', '--local': 'Use this repository’s config.' },
  },
  show: {
    summary: 'Show a commit, tag or tree object with its metadata and patch.',
    flags: { '--stat': 'Show a diffstat instead of the full patch.' },
  },
  blame: {
    summary: 'Show which commit last changed each line of a file.',
    flags: { '-L': 'Limit blame to a line range.' },
  },
  worktree: {
    summary: 'Manage additional working trees attached to one repository.',
    flags: { add: 'Add a linked worktree.', list: 'List worktrees.', remove: 'Remove a worktree.' },
  },
  submodule: {
    summary: 'Manage repositories nested inside this repository.',
    flags: {
      update: 'Check out the recorded submodule commits.',
      '--init': 'Initialize submodules before updating.',
    },
  },
};

const globalFlags: Record<string, string> = {
  '-C': 'Run as if Git started in the given directory.',
  '-c': 'Set a configuration value for this command only.',
  '--version': 'Print the Git version.',
  '--help': 'Open the manual page for the command.',
  '--no-pager': 'Do not pipe output through a pager.',
};

function splitCommand(value: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

export const gitCommandExplainer: ToolDefinition = {
  id: 'git-command-explainer',
  name: 'Git command explainer',
  summary: 'Read a Git command and see what it does, its flags and its risks before you run it.',
  category: 'git',
  version: '1.0.0',
  tags: ['git', 'command', 'explain', 'safety'],
  aliases: ['explain git', 'git help'],
  privacy: { locality: 'local', note: 'The command is parsed locally. Nothing is executed.' },
  input: {
    label: 'Git command',
    sample: 'git push --force origin main',
    rows: 3,
  },
  run(input): ToolResult {
    const raw = assertInput(input).trim();
    const tokens = splitCommand(raw);
    if (tokens[0]?.toLowerCase() === 'git') tokens.shift();
    if (tokens.length === 0) throw new ToolError('Add a command after git.');
    const command = tokens[0].toLowerCase();
    const doc = commands[command];
    if (!doc) {
      throw new ToolError(
        `"${command}" is not in the local reference yet. Known commands: ${Object.keys(commands).join(', ')}.`,
      );
    }
    const args = tokens.slice(1);
    const flags = args.filter((token) => token.startsWith('-'));
    const positionals = args.filter((token) => !token.startsWith('-'));
    const lines: string[] = [`git ${[command, ...args].join(' ')}`, '', 'What it does', doc.summary];

    if (positionals.length > 0) {
      lines.push('', 'Arguments', positionals.map((value) => `  ${value}`).join('\n'));
    }
    const known = { ...globalFlags, ...(doc.flags ?? {}) };
    if (flags.length > 0) {
      lines.push('', 'Flags');
      for (const flag of flags) {
        const name = flag.split('=')[0];
        lines.push(`  ${name}  ${known[name] ?? 'Not in the local reference. Check git help for this flag.'}`);
      }
    }
    if (doc.caution) lines.push('', 'Caution', doc.caution);
    if (doc.safer) lines.push('', 'Safer alternative', doc.safer);
    if (command === 'reset' && flags.some((flag) => flag.startsWith('--hard'))) {
      lines.push('', 'Recovery', 'Discarded uncommitted changes are not in Git history. Check git reflog only for committed work.');
    }
    if (command === 'push' && flags.some((flag) => flag === '-f' || flag.startsWith('--force'))) {
      lines.push('', 'Recommendation', 'Use git push --force-with-lease so you cannot overwrite commits you have not seen.');
    }
    return {
      output: lines.join('\n'),
      meta: [
        { label: 'Command', value: `git ${command}` },
        { label: 'Flags', value: String(flags.length) },
      ],
      warnings: doc.caution ? ['This command has a destructive edge. Read the caution below.'] : undefined,
    };
  },
  docs: {
    about:
      'A curated local reference for common Git commands and flags, with safety notes. It explains; it never runs anything.',
    limitations: [
      'The reference covers the most common commands and flags, not every Git option.',
      'Behaviour can differ with Git configuration, hooks and aliases; check git help for your version.',
    ],
  },
};

const gitignoreTemplates: Record<string, { title: string; lines: string[] }> = {
  node: {
    title: 'Node',
    lines: ['node_modules/', '.pnpm-store/', 'npm-debug.log*', 'yarn-debug.log*', 'yarn-error.log*', '.next/', 'dist/', 'coverage/', '*.tsbuildinfo'],
  },
  python: {
    title: 'Python',
    lines: ['__pycache__/', '*.py[cod]', '.venv/', 'venv/', 'env/', '.pytest_cache/', '.mypy_cache/', '.ruff_cache/', '*.egg-info/', 'dist/', 'build/'],
  },
  go: { title: 'Go', lines: ['bin/', 'dist/', '*.test', '*.out', 'vendor/'] },
  rust: { title: 'Rust', lines: ['target/', '**/*.rs.bk', 'Cargo.lock'] },
  java: { title: 'Java', lines: ['target/', '*.class', '*.jar', '*.war', '.gradle/', 'build/'] },
  dotnet: { title: '.NET', lines: ['bin/', 'obj/', '*.user', '*.suo', '.vs/'] },
  macos: { title: 'macOS', lines: ['.DS_Store', '.AppleDouble', '.LSOverride', '._*'] },
  windows: { title: 'Windows', lines: ['Thumbs.db', 'ehthumbs.db', 'Desktop.ini', '$RECYCLE.BIN/'] },
  linux: { title: 'Linux', lines: ['*~', '.directory', '.Trash-*'] },
  vscode: { title: 'VS Code', lines: ['.vscode/*', '!.vscode/extensions.json', '!.vscode/settings.json'] },
  jetbrains: { title: 'JetBrains', lines: ['.idea/', '*.iml', '*.iws', '*.ipr'] },
  env: { title: 'Environment files', lines: ['.env', '.env.local', '.env.*.local', '!.env.example'] },
  docker: { title: 'Docker', lines: ['.docker/', 'docker-compose.override.yml'] },
  terraform: { title: 'Terraform', lines: ['.terraform/', '*.tfstate', '*.tfstate.*', 'crash.log', '*.tfvars'] },
  nextjs: { title: 'Next.js', lines: ['.next/', 'out/', '.vercel/', 'next-env.d.ts'] },
  'node+next': { title: 'Node + Next.js', lines: ['node_modules/', '.next/', 'out/', 'dist/', 'coverage/', '.env.local', '*.tsbuildinfo'] },
};

const templateAliases: Record<string, string> = {
  js: 'node',
  javascript: 'node',
  typescript: 'node',
  ts: 'node',
  next: 'nextjs',
  py: 'python',
  golang: 'go',
  rustlang: 'rust',
  mac: 'macos',
  win: 'windows',
  code: 'vscode',
  idea: 'jetbrains',
  terraform: 'terraform',
  tf: 'terraform',
};

export const gitignoreGenerator: ToolDefinition = {
  id: 'gitignore-generator',
  name: '.gitignore generator',
  summary: 'Compose a .gitignore from stack presets and your own patterns.',
  category: 'git',
  version: '1.0.0',
  tags: ['git', 'gitignore', 'ignore', 'setup'],
  aliases: ['gitignore', 'ignore file'],
  privacy: { locality: 'local', note: 'Generated in your browser.' },
  input: {
    label: 'Presets or patterns',
    sample: `node
nextjs
macos
windows
env
# custom
*.local.json
scratch/`,
    rows: 10,
  },
  options: [{ kind: 'toggle', id: 'headers', label: 'Include section comments', defaultValue: true }],
  run(input, options): ToolResult {
    const source = assertInput(input);
    const includeHeaders = optionBoolean(options, 'headers', true);
    const sections: Array<{ title: string; lines: string[] }> = [];
    const custom: string[] = [];
    const unknown: string[] = [];
    const used = new Set<string>();

    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const key = line.toLowerCase().replace(/[._\s]+/g, '');
      const resolved = templateAliases[key] ?? (gitignoreTemplates[key] ? key : undefined);
      if (resolved && !used.has(resolved)) {
        used.add(resolved);
        sections.push(gitignoreTemplates[resolved]);
      } else if (!resolved && line.includes('/') === false && /^[a-z0-9+._-]+$/i.test(line)) {
        unknown.push(line);
        custom.push(line);
      } else {
        custom.push(line);
      }
    }
    if (custom.length > 0) sections.push({ title: 'Custom', lines: custom });
    if (sections.length === 0) {
      throw new ToolError(
        `No presets or patterns found. Available presets: ${Object.keys(gitignoreTemplates).join(', ')}.`,
      );
    }
    const output = sections
      .map((section) => {
        const body = section.lines.join('\n');
        return includeHeaders ? `# ${section.title}\n${body}` : body;
      })
      .join('\n\n');
    const warnings: string[] = [];
    if (unknown.length > 0) {
      warnings.push(
        `Treated as custom patterns: ${unknown.join(', ')}. Check the preset names if you meant a template.`,
      );
    }
    return {
      output: `${output}\n`,
      meta: [
        { label: 'Sections', value: String(sections.length) },
        { label: 'Patterns', value: String(sections.reduce((sum, section) => sum + section.lines.length, 0)) },
      ],
      warnings,
    };
  },
  docs: {
    about:
      'Each non-empty line is either a known preset name or a literal ignore pattern. Presets are merged and deduplicated by section.',
    limitations: [
      'The preset list is small and curated; it is not a complete gitignore.io database.',
      'Pattern order can matter for negated rules. Review the generated file before committing.',
    ],
  },
};

const commitTypes = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
] as const;

export const commitMessageGenerator: ToolDefinition = {
  id: 'commit-message-generator',
  name: 'Commit message generator',
  summary: 'Build a Conventional Commits message with scope, body and breaking-change notes.',
  category: 'git',
  version: '1.0.0',
  tags: ['git', 'commit', 'conventional commits', 'message'],
  aliases: ['commit message', 'conventional commit'],
  privacy: { locality: 'local', note: 'Generated in your browser.' },
  input: {
    label: 'Summary',
    sample: 'add request history to the API builder',
    rows: 3,
  },
  options: [
    {
      kind: 'select',
      id: 'type',
      label: 'Type',
      defaultValue: 'feat',
      choices: commitTypes.map((type) => ({ value: type, label: type })),
    },
    { kind: 'text', id: 'scope', label: 'Scope', defaultValue: 'api', placeholder: 'optional, e.g. api' },
    { kind: 'toggle', id: 'breaking', label: 'Breaking change', defaultValue: false },
    { kind: 'text', id: 'issue', label: 'Issue reference', defaultValue: '', placeholder: 'e.g. 42' },
  ],
  run(input, options): ToolResult {
    const summary = assertInput(input, 'Summary').trim().replace(/\s+/g, ' ');
    const type = optionString(options, 'type', 'feat');
    const scope = optionString(options, 'scope').trim();
    const breaking = optionBoolean(options, 'breaking');
    const issue = optionString(options, 'issue').trim();
    if (!commitTypes.includes(type as (typeof commitTypes)[number])) {
      throw new ToolError(`Unknown commit type "${type}".`);
    }
    if (summary.endsWith('.')) {
      throw new ToolError('Commit summaries do not end with a period.');
    }
    const header = `${type}${scope ? `(${scope})` : ''}${breaking ? '!' : ''}: ${summary}`;
    const lines = [header];
    if (breaking) {
      lines.push('', 'BREAKING CHANGE: describe what breaks and how to migrate.');
    }
    if (issue) {
      lines.push('', `Refs: #${issue.replace(/^#/, '')}`);
    }
    const warnings: string[] = [];
    if (header.length > 72) warnings.push(`Header is ${header.length} characters; 72 is the usual limit.`);
    if (/^[A-Z]/.test(summary)) warnings.push('Summary usually starts lowercase after the type prefix.');
    return {
      output: lines.join('\n'),
      meta: [
        { label: 'Header length', value: String(header.length) },
        { label: 'Type', value: type },
      ],
      warnings,
    };
  },
  docs: {
    about:
      'Produces a Conventional Commits v1.0.0 header. The tool formats the message; you still decide whether the change is breaking.',
    limitations: [
      'It cannot judge whether a change is actually breaking.',
      'The body and footer are placeholders when breaking is enabled and must be completed.',
    ],
  },
};

const changelogSections: Record<string, string> = {
  feat: 'Features',
  fix: 'Bug Fixes',
  perf: 'Performance',
  docs: 'Documentation',
  refactor: 'Refactoring',
  test: 'Tests',
  build: 'Build',
  ci: 'CI',
  chore: 'Chores',
  style: 'Style',
  revert: 'Reverts',
};

export interface ChangelogCommit {
  type: string;
  scope?: string;
  description: string;
  breaking: boolean;
  hash?: string;
}

export function parseConventionalCommits(source: string): {
  commits: ChangelogCommit[];
  skipped: number;
} {
  const commits: ChangelogCommit[] = [];
  let skipped = 0;
  for (const rawLine of source.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (!line) continue;
    line = line.replace(/^[-*]\s+/, '');
    if (/^merge\b/i.test(line) || /^revert\b/i.test(line) && !line.includes(':')) {
      skipped += 1;
      continue;
    }
    const match =
      /^(?:([0-9a-f]{7,40})\s+)?([a-z]+)(?:\(([^)]+)\))?(!)?:\s+(.+)$/i.exec(line);
    if (!match) {
      skipped += 1;
      continue;
    }
    commits.push({
      hash: match[1],
      type: match[2].toLowerCase(),
      scope: match[3],
      breaking: Boolean(match[4]),
      description: match[5].trim(),
    });
  }
  return { commits, skipped };
}

export const changelogGenerator: ToolDefinition = {
  id: 'changelog-generator',
  name: 'Changelog generator',
  summary: 'Turn Conventional Commit lines into grouped Markdown release notes.',
  category: 'git',
  version: '1.0.0',
  tags: ['git', 'changelog', 'release', 'markdown'],
  aliases: ['release notes', 'conventional changelog'],
  privacy: { locality: 'local', note: 'Parsed in your browser.' },
  input: {
    label: 'Commit lines',
    sample: `feat(api): add request history
fix(api): cancel in-flight requests on reset
perf(json): avoid re-parsing sorted output
docs: document the plugin manifest format
feat!: require explicit AI consent before sending code
chore: bump dev dependencies`,
    rows: 12,
  },
  options: [
    { kind: 'text', id: 'version', label: 'Version label', defaultValue: 'Unreleased' },
    { kind: 'toggle', id: 'date', label: 'Include today’s date', defaultValue: true },
  ],
  run(input, options): ToolResult {
    const source = assertInput(input);
    const { commits, skipped } = parseConventionalCommits(source);
    if (commits.length === 0) {
      throw new ToolError(
        'No Conventional Commit lines found. Expected lines like "feat(api): add history".',
      );
    }
    const version = optionString(options, 'version', 'Unreleased').trim() || 'Unreleased';
    const date = optionBoolean(options, 'date', true)
      ? ` - ${new Date().toISOString().slice(0, 10)}`
      : '';
    const groups = new Map<string, ChangelogCommit[]>();
    for (const commit of commits) {
      const key = changelogSections[commit.type] ?? 'Other';
      groups.set(key, [...(groups.get(key) ?? []), commit]);
    }
    const lines = [`## [${version}]${date}`, ''];
    for (const [heading, entries] of groups) {
      lines.push(`### ${heading}`, '');
      for (const entry of entries) {
        const scope = entry.scope ? `**${entry.scope}:** ` : '';
        const hash = entry.hash ? ` (${entry.hash.slice(0, 7)})` : '';
        lines.push(`- ${scope}${entry.description}${hash}`);
      }
      lines.push('');
    }
    const breaking = commits.filter((commit) => commit.breaking);
    if (breaking.length > 0) {
      lines.push('### Breaking changes', '');
      for (const entry of breaking) lines.push(`- ${entry.description}`);
      lines.push('');
    }
    return {
      output: lines.join('\n').trimEnd(),
      meta: [
        { label: 'Commits', value: String(commits.length) },
        { label: 'Skipped lines', value: String(skipped) },
      ],
      warnings: skipped > 0 ? [`${skipped} line(s) were not Conventional Commits and were skipped.`] : undefined,
    };
  },
  docs: {
    about:
      'Groups parsed commits into Features, Fixes and the other Conventional Commit types, then adds a breaking-changes section.',
    limitations: [
      'Only single-line conventional commits are parsed.',
      'It does not read Git history; paste the commit subjects you want included.',
    ],
  },
};

export const prDescriptionGenerator: ToolDefinition = {
  id: 'pr-description-generator',
  name: 'PR description generator',
  summary: 'Assemble a pull request description from your change list and test notes.',
  category: 'git',
  version: '1.0.0',
  tags: ['git', 'github', 'pull request', 'template'],
  aliases: ['pr template', 'pull request description'],
  privacy: { locality: 'local', note: 'Built in your browser.' },
  input: {
    label: 'What changed',
    sample: `Add a request history panel to the API builder
Persist the last 20 requests in local storage
Strip authorization headers from history
Add tests for request cancellation`,
    rows: 8,
  },
  options: [
    {
      kind: 'select',
      id: 'kind',
      label: 'Change kind',
      defaultValue: 'feature',
      choices: [
        { value: 'feature', label: 'Feature' },
        { value: 'fix', label: 'Fix' },
        { value: 'docs', label: 'Documentation' },
        { value: 'refactor', label: 'Refactor' },
      ],
    },
    { kind: 'text', id: 'issue', label: 'Issue number', defaultValue: '', placeholder: 'e.g. 128' },
    { kind: 'toggle', id: 'breaking', label: 'Breaking change', defaultValue: false },
  ],
  run(input, options): ToolResult {
    const changes = assertInput(input)
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*]\s+/, '').trim())
      .filter(Boolean);
    if (changes.length === 0) throw new ToolError('Add at least one change.');
    const kind = optionString(options, 'kind', 'feature');
    const issue = optionString(options, 'issue').trim().replace(/^#/, '');
    const breaking = optionBoolean(options, 'breaking');
    const lines = [
      '## Summary',
      '',
      `This ${kind} changes ${changes.length} thing${changes.length === 1 ? '' : 's'}:`,
      '',
      ...changes.map((change) => `- ${change}`),
      '',
      '## Testing',
      '',
      '- [ ] Automated tests pass locally',
      '- [ ] Manual check completed for the changed flow',
      '',
      '## Checklist',
      '',
      '- [ ] Documentation updated where behaviour changed',
      '- [ ] No secrets, tokens or personal data added',
      '- [ ] Accessibility checked for UI changes',
    ];
    if (breaking) {
      lines.push('', '## Breaking change', '', 'Describe what breaks and how to migrate.');
    }
    if (issue) lines.push('', `Closes #${issue}`);
    const output = lines.join('\n');
    return {
      output,
      meta: [
        { label: 'Changes', value: String(changes.length) },
        { label: 'Kind', value: kind },
      ],
      warnings: [
        'The Testing and Checklist boxes are prompts, not evidence. Tick them only after doing the work.',
      ],
    };
  },
  docs: {
    about: 'Formats your own change list into a review-friendly pull request description.',
    limitations: [
      'It does not read the diff or run tests, so it cannot verify the claims in the checklist.',
      'Review the generated text before opening the pull request.',
    ],
  },
};
