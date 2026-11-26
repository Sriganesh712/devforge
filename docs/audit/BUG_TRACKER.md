# DevForge Bug Tracker

**Format:** ID | Title | Severity | Status | Module | File | Reproduction | Expected | Actual | Fix

| ID | Severity | Title | Module | File |
|----|----------|-------|--------|------|
| B-01 | P0 | No application routes — app is inaccessible | App Router | `src/app/` |
| B-02 | P0 | No test files exist | Testing | (none) |
| B-03 | P0 | No ESLint config — lint cannot run | Tooling | (root) |
| B-04 | P0 | No LICENSE file (Apache-2.0 declared but not present) | Governance | (root) |
| B-05 | P0 | No README.md | Governance | (root) |
| B-06 | P1 | `.git` exists but has zero commits | VCS | `.git/` |
| B-07 | P1 | No CI/CD workflows | CI | (none) |
| B-08 | P1 | No `/api/ai` route or AI gateway | AI | (none) |
| B-09 | P2 | No `/tools`, `/tools/[category]`, `/tools/[category]/[slug]` routes | Routing | `src/app/` |
| B-10 | P2 | No `/workspace` UI page | Workspace | `src/features/workspace/` |
| B-11 | P2 | No `/plugins` validator page | Plugins | `src/packages/tool-sdk/plugin.ts` |
| B-12 | P2 | No `/docs/[[...slug]]` route | Docs | (none) |
| B-13 | P2 | No `/ai` route | AI Studio | (none) |
| B-14 | P2 | No `/settings` page | Settings | (none) |
| B-15 | P2 | No `/community` page | Community | (none) |
| B-16 | P2 | `truncate()` adds single `.` instead of ellipsis | Utils | `src/lib/utils.ts` |
| B-17 | P3 | No CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md | Governance | (root) |
| B-18 | P3 | No `pnpm-workspace.yaml` at root | Tooling | (root) |
| B-19 | P3 | `apps/web/` is a separate project causing confusion | Structure | `apps/web/` |

**Total bugs tracked: 19**
- P0: 5 (B-01 to B-05)
- P1: 4 (B-06 to B-09... actually B-06 to B-08 = 3 P1s)
- P2: 7 (B-09 to B-16)
- P3: 3 (B-17 to B-19)

Wait, let me recount:
- P0: B-01, B-02, B-03, B-04, B-05 = 5
- P1: B-06, B-07, B-08 = 3
- P2: B-09, B-10, B-11, B-12, B-13, B-14, B-15, B-16 = 8
- P3: B-17, B-18, B-19 = 3

Total: 19
