# Getting Started with DevForge

DevForge is a local-first, open-source developer productivity platform with 51 first-party tools across 9 categories. Everything runs in your browser tab — nothing is uploaded, no accounts required.

## Installation

Requires Node.js >= 20.9.0 and pnpm.

```bash
git clone <repository-url>
cd devforge
pnpm install
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
| `pnpm e2e` | Run Playwright end-to-end tests |

## Tool categories

DevForge bundles 51 tools across 9 categories:

- **Code** — JSON formatter, YAML, XML, CSV, regex tester, and more
- **Git & GitHub** — Git command explainer, gitignore generator, commit message generator
- **API Development** — HTTP request builder, cURL converter
- **Code Quality** — Complexity analyzer, duplicate code detector
- **Database Studio** — SQL formatter, connection string parser
- **Security Lab** — JWT decoder, hash generator, password strength estimator
- **DevOps & Cloud** — Dockerfile generator, cron builder, .env validator
- **Frontend Lab** — CSS gradient generator, contrast checker, HTML playground
- **Backend Lab** — HTTP status explorer, MIME type lookup, URL parser

## Security

DevForge is local-first by design:

- All tools run in your browser. Nothing is uploaded to a server.
- HTTP requests go directly from your browser via `fetch` — there is no server-side proxy (no SSRF surface).
- The HTML playground renders in a sandboxed iframe (`sandbox="allow-scripts"`, no `same-origin`).
- JWT decoding never proves authenticity — HMAC verification is an explicit second step.
- Plugins are declarative manifests only; no arbitrary plugin JS execution.

## License

Apache-2.0. See [LICENSE](/LICENSE) for details.
