# DevForge Changelog

## [0.1.0] — 2026-11-26

### Added
- 51 first-party developer tools across 9 categories (code, git, api, quality, database, security, devops, frontend, backend)
- Local-first workspace: favorites, recents, snippets, bookmarks persisted to localStorage
- Ctrl+K search with keyboard navigation
- Light/dark/system theme support
- Plugin manifest validation (declarative, no third-party code execution)
- HTTP request builder (browser fetch, no server proxy, no SSRF)
- JWT decoder with explicit HMAC verification (decode ≠ verify)
- AI Studio route with BYO-key AI gateway (`/api/ai`) supporting OpenAI, Groq, OpenRouter, Ollama
- CI/CD workflow (typecheck, lint, test, build on push/PR)
- Dependabot for dependency updates
- Open-source governance: LICENSE (Apache-2.0), README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY
- Issue and pull request templates
- Documentation: getting started, security policy, implementation status
- `/docs` route with case-insensitive Markdown rendering

### Fixed
- Theme flash on client-side navigation (useLayoutEffect instead of useEffect)
- Script tag errors in Server Component layout (removed inline `<script>` from layout)
- Docs slug handling (defensive against undefined params)

### Removed
- Internal audit documentation (not needed by external contributors)
- `apps/web/` (separate starter project causing confusion)
