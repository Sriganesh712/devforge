# DevForge

**One platform. Every developer tool.**

DevForge is a local-first, open-source developer productivity platform with 51 first-party tools across 9 categories. Everything runs in your browser tab — nothing is uploaded, no accounts required.

## What it does

DevForge bundles developer utilities into a single Next.js App Router application:

| Category | Tools |
|----------|-------|
| Code | JSON formatter, JSON diff, JSON to TypeScript, YAML, XML, CSV, text diff, Markdown preview, URL codec, Base64, UUID, timestamp, regex tester |
| Git & GitHub | Git command explainer, gitignore generator, commit message generator, changelog generator, PR description generator, git graph visualizer, GitHub repository explorer |
| API Development | HTTP request builder, cURL converter, webhook docs, API docs generator |
| Code Quality | Complexity analyzer, duplicate code detector, package.json analyzer |
| Database Studio | SQL formatter, connection string parser, schema visualizer |
| Security Lab | JWT decoder, hash generator & verifier, password strength estimator, secure random generator, security header analyzer |
| DevOps & Cloud | Dockerfile generator, Docker Compose generator, GitHub Actions generator, cron builder, .env validator |
| Frontend Lab | CSS gradient generator, box shadow generator, color converter, contrast checker, flexbox playground, HTML playground, SVG optimizer |
| Backend Lab | HTTP status explorer, MIME type lookup, URL parser, request header inspector |

## Installation

Requires Node.js >= 20.9.0 and pnpm.

```bash
# Clone the repository
git clone <repository-url>
cd devforge

# Install dependencies
pnpm install

# Start the development server
pnpm dev
```

Open http://localhost:3000 in your browser.

## Available scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm start` | Start production server |
| `pnpm typecheck` | TypeScript type check |
| `pnpm test` | Run Vitest unit tests |
| `pnpm lint` | Run ESLint |
| `pnpm format` | Format code with Prettier |
| `pnpm e2e` | Run Playwright end-to-end tests |

## Architecture

DevForge is a single deployable Next.js modular monolith:

- `src/packages/` — shared libraries (tool SDK, UI components, core helpers)
- `src/tools/<domain>/` — tool implementations by domain (code, git, api, quality, database, security, devops, frontend, backend)
- `src/features/<domain>/` — feature modules (tools runner, workspace, search)
- `src/app/` — Next.js App Router pages

Each tool is a pure function over strings with its `run` logic separated from its UI. Custom tool views (JWT decoder, HTTP client, cron builder, etc.) are lazy-loaded per tool.

## Security

- **Local-first:** All tools run in your browser. Nothing is uploaded to a server.
- **No SSRF:** HTTP requests go directly from your browser via `fetch`; there is no server-side proxy.
- **Sandboxed HTML:** The HTML playground renders in an iframe with `sandbox="allow-scripts"` and no `same-origin`.
- **Secret redaction:** Authorization, Cookie, and token headers are redacted in reports.
- **JWT decode ≠ verify:** Decoding a JWT never proves authenticity. HMAC verification is an explicit second step with a secret you supply.
- **Plugins are declarative:** Plugin manifests describe tools but cannot execute arbitrary JavaScript.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute.

## License

Apache-2.0. See [LICENSE](LICENSE).

## Security policy

See [SECURITY.md](SECURITY.md) for how to report vulnerabilities.

## Roadmap

See [docs/development/IMPLEMENTATION_STATUS.md](docs/development/IMPLEMENTATION_STATUS.md) for the current implementation status and roadmap.
