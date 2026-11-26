# DevForge Contribution Guide

Thank you for considering a contribution to DevForge! DevForge is a local-first, open-source developer productivity platform released under the Apache-2.0 license.

## How to contribute

### 1. Fork and clone

```bash
git clone <your-fork-url>
cd devforge
pnpm install
```

### 2. Run the project

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the development server on http://localhost:3000 |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm typecheck` | TypeScript type check (`tsc --noEmit`) |
| `pnpm test` | Run Vitest unit tests |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |
| `pnpm e2e` | Run Playwright end-to-end tests |

All checks must pass before a pull request can be merged.

### 3. Add a tool

DevForge tools are pure functions over strings. To add a new tool:

1. Create the tool definition in `src/tools/<domain>/<tool>.ts` following the `ToolDefinition` contract in `src/packages/tool-sdk/types.ts`.
2. Export it from `src/tools/<domain>/index.ts`.
3. Import it in `src/packages/tool-sdk/registry.ts`.
4. Optionally create a custom UI in `src/features/tools/custom/<domain>-ui.tsx` and register it in `custom/index.tsx`.
5. Add tests in `tests/` covering happy path, edge cases, and error cases.

Tools should be:
- **Local-first:** No server round-trips unless explicitly documented.
- **Honest about limitations:** Document what the tool cannot do.
- **Tested:** Every `run` function should have unit tests.

### 4. Submit a pull request

- Create a branch from `master`: `git checkout -b feature/your-feature`
- Make your changes, run `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm build`.
- Commit with a clear message: `feat: add <description>` or `fix: <description>`.
- Push to your fork and open a pull request against `master`.

A maintainer will review your PR. Be patient — review may take a few days.

## Code style

- Use 2-space indentation (no tabs).
- Use single quotes for strings.
- Components are React Server Components by default; add `'use client'` only when needed.
- Tool logic stays in `src/tools/`; UI components live in `src/features/tools/custom/` or `src/packages/ui/`.

## License

By contributing, you agree that your contributions will be licensed under the Apache-2.0 license.
