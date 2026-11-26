# DevForge Remediation Plan

**Based on:** Ponytail Quality Audit (26 November 2026)
**Total findings:** 19 (5 P0, 3 P1, 8 P2, 3 P3)

---

## Phase 1 — P0 Critical (must fix before any release)

### B-01: No application routes
**Impact:** Application is completely inaccessible — build only emits `/404`.
**Fix:** Create Next.js App Router pages:
- `src/app/page.tsx` — dashboard with featured tools, categories, search
- `src/app/tools/page.tsx` — all tools grid, filterable by category
- `src/app/tools/[category]/page.tsx` — tools within a category
- `src/app/tools/[category]/[slug]/page.tsx` — individual tool page using `ToolRunner`
- `src/app/not-found.tsx` — custom 404

Use existing `tool-runner.tsx` and `customToolComponents` for tool pages. Use `catalog` entries (already computed in `layout.tsx`) for the tools listing.

**Effort:** Large (5+ route files)

### B-02: No test files
**Impact:** Zero test coverage; regressions undetectable.
**Fix:** Create `tests/` directory with:
- `tests/tool-logic.test.ts` — test `run()` for key tools
- `tests/registry.test.ts` — test `assertRegistryIntegrity()`, `searchTools()`
- `tests/plugin.test.ts` — test `validatePluginManifest()`
- `tests/workspace.test.ts` — test `sanitizeWorkspace()`, `parseWorkspaceImport()`
- `tests/search.test.ts` — test `rankTools()`

**Effort:** Medium

### B-03: No ESLint config
**Impact:** `pnpm lint` cannot run.
**Fix:** Create `eslint.config.js` using `eslint-config-next`.

**Effort:** Small

### B-04: No LICENSE file
**Impact:** Apache-2.0 license declared in package.json but not legally effective without a LICENSE file.
**Fix:** Add `LICENSE` with Apache-2.0 text.

**Effort:** Small

### B-05: No README.md
**Impact:** Contributors cannot install or run the project.
**Fix:** Add `README.md` with: project description, installation (`pnpm install`), development (`pnpm dev`), build (`pnpm build`), test (`pnpm test`), architecture overview, license.

**Effort:** Medium

---

## Phase 2 — P1 High

### B-06: `.git` has zero commits
**Fix:** Initialize git repo with initial commit of all source files.

**Effort:** Small

### B-07: No CI/CD workflows
**Fix:** Add `.github/workflows/ci.yml` with:
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

**Effort:** Small

### B-08: No `/api/ai` route
**Fix:** Create `src/app/api/ai/route.ts` with:
- Zod validation for request body
- Provider allowlist (OpenAI, Groq, OpenRouter, Ollama)
- Ollama host guard (localhost only, or explicit env override)
- No key logging/storage
- Per-request API key (never stored)

**Effort:** Medium

---

## Phase 3 — P2 Medium

### B-09 to B-15: Missing route pages
**Fix:** Create:
- `src/app/tools/page.tsx`
- `src/app/tools/[category]/page.tsx`
- `src/app/tools/[category]/[slug]/page.tsx`
- `src/app/workspace/page.tsx`
- `src/app/plugins/page.tsx`
- `src/app/docs/[[...slug]]/page.tsx`
- `src/app/ai/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/community/page.tsx`

**Effort:** Large

### B-16: `truncate()` adds single `.`
**Fix:** Change `src/lib/utils.ts` to use `...` ellipsis (slice `max - 3` chars).

**Effort:** Tiny

---

## Phase 4 — P3 Low

### B-17: Missing governance files
**Fix:** Add `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`.

**Effort:** Medium

### B-18: No `pnpm-workspace.yaml`
**Fix:** Add `pnpm-workspace.yaml` at root (even if only one package, it declares intent).

**Effort:** Tiny

### B-19: `apps/web/` confusion
**Fix:** Either remove `apps/web/` or clearly document it as a separate/starter project. Recommend removing it from the DevForge repo root.

**Effort:** Small

---

## Order of execution

| Week | Tasks |
|------|-------|
| 1 | B-04 (LICENSE), B-05 (README), B-03 (ESLint config), B-06 (git init) |
| 2 | B-01 (routes — dashboard, tools listing, tool page), B-07 (CI) |
| 3 | B-02 (tests), B-16 (truncate fix) |
| 4 | B-09 to B-15 (remaining routes), B-08 (AI route) |
| 5 | B-17 (governance files), B-18 (workspace yaml), B-19 (apps/web cleanup) |

---

## Definition of done for Public Alpha

All P0 and P1 findings resolved. At least 50% of P2 findings resolved. Production build passes. Tests pass (at least the minimum viable suite). Lint passes. README and LICENSE present. CI workflow runs on push.

**Estimated total effort:** 3-4 weeks for one developer.
