# DevForge Roadmap

## Released — 0.1.0 (Alpha)

- 51 first-party tools across 9 categories
- Local-first workspace (localStorage)
- Ctrl+K search
- Theme support (light/dark/system)
- Plugin manifest validation
- HTTP request builder
- AI gateway route (`/api/ai`)
- CI/CD and open-source governance files

## Next — 0.2.0

- `/workspace` UI polish (favorites, recents, snippets, bookmarks)
- AI Studio UI (configure provider + key, send prompts)
- Plugin submission workflow (reviewed first-party path)
- Docs content expansion (tool guides, architecture)
- `/settings` page (theme, workspace export/import)
- `/community` page (links, contributing guide)

## Later — 0.3.0

- Playwright smoke tests for critical paths
- Additional tool categories (quality, backend expansions)
- Improved search ranking and filters
- Accessibility audit remediation

## Not planned for alpha

- PostgreSQL/Prisma runtime (workspace stays localStorage-first)
- Server-side proxy for HTTP requests (browser fetch only, no SSRF surface)
- Community plugin code execution (plugins are declarative manifests only)
- React Flow (git graph and ER diagrams use custom SVG)
- User accounts or authentication
