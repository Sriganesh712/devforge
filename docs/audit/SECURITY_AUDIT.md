# DevForge Quality Audit — Security Audit

**Scope:** Source code review of XSS, SSRF, authentication, secrets handling, plugin security, CSP.
**Penetration testing:** Not performed (no running routes; no third-party probing per policy).

## Security design decisions (from project summary)

| Decision | Implementation | Status |
|----------|---------------|--------|
| Local-first, no accounts | localStorage workspace | Implemented (`store.ts`) |
| No arbitrary plugin JS execution | Declarative manifests only | Schema exists (`plugin.ts`) |
| No SSRF | Browser fetch only, no server proxy | HTTP client uses browser fetch |
| Sandbox HTML | iframe `sandbox="allow-scripts"` no `same-origin` | `HtmlUi` in `code-ui.tsx` |
| Redact secrets | `redactHeaders()` in `core/http.ts` | Implemented |
| Never claim JWT authenticity without verification | Decode separate from HMAC verify | `security.ts` — explicit |
| AI is BYO-key, never stores/logs keys | Not implemented | `/api/ai` route missing |
| Plugins are declarative manifests only | Zod schema, no code execution | `plugin.ts` — implemented |
| CSP headers | `next.config.ts` | Implemented |

## Security findings

### P0 — Critical

None found in existing source code. The security design decisions are correctly implemented where code exists.

### P1 — High

**F24 — No `/api/ai` route exists.** The AI gateway route (planned for BYO-key AI) is not implemented. The `next.config.ts` CSP already allows connections to Ollama at `localhost:11434`, indicating intent, but there is no route handler to validate providers, guard Ollama hosts, or prevent key logging. This is a missing feature, not an active vulnerability.

### P2 — Medium

**F25 — HTML playground uses `dangerouslySetInnerHTML` with DOMPurify.** The `MarkdownUi` renders sanitized HTML via `dangerouslySetInnerHTML={{ __html: html }}`. DOMPurify is used for sanitization, which is the correct approach. However, any bypass in DOMPurify could lead to XSS. The sandboxed HTML preview (`HtmlUi`) uses an iframe with `sandbox="allow-scripts"` and no `same-origin`, which is properly isolated.

**F26 — JWT HMAC verification uses `crypto.subtle` which requires secure context.** The code checks `typeof crypto === 'undefined'` and throws a helpful error. This is correct defensive coding.

**F27 — Secret redaction in HTTP client.** `network-ui.tsx` redacts `authorization`, `cookie`, `token`, `secret`, `api-key` headers in the response display. This is correct.

**F28 — cURL converter warns about Basic auth credentials.** The `parseCurl` function converts `-u` to an `Authorization` header and adds a warning. This is correct.

### P3 — Low

**F29 — CSP allows `unsafe-inline` for scripts.** The `next.config.ts` CSP includes `script-src 'self' 'unsafe-inline'`. This is necessary for the inline theme script in `layout.tsx` (`dangerouslySetInnerHtml` with a script tag). It is a controlled risk but widens the XSS surface slightly.

**F30 — No rate limiting on any endpoint.** There are no server-side API routes, so rate limiting is not applicable. The browser-based GitHub explorer is subject to GitHub's own rate limits (60/hour unauthenticated).

**F31 — `.env.local` is gitignored.** Good — no risk of committing environment variables.

## SSRF assessment

The HTTP client tool uses **browser fetch only** — there is no server-side proxy. The browser enforces CORS, and DevForge cannot bypass it. The `next.config.ts` CSP `connect-src` allows `'self' https:` and `http://127.0.0.1:11434` / `http://localhost:11434`. No server-side fetch exists that could be exploited for SSRF. **SSRF risk: none.**

## Plugin security

The plugin manifest schema (`plugin.ts`) is declarative only:
- No `code`, `script`, or `eval` fields
- Tools are either `external` (URL reference) or `first-party` (references an existing toolId)
- Permissions are limited to `clipboard.write`, `network.user-initiated`, `workspace.local`
- No community code execution possible

**Plugin security risk: none.** The architecture correctly prevents arbitrary plugin JS execution.

## Secret handling

- JWT tokens are decoded locally, never uploaded
- Passwords are never transmitted (strength estimator is local)
- Hash computation uses Web Crypto locally
- API keys for AI are not stored (route not implemented)
- Workspace data is localStorage only (no server)

**Secret handling: correct.**

## Verdict

Security design is sound where implemented. No active vulnerabilities found in the source code. The primary security gap is the **missing `/api/ai` route** — the AI gateway was designed (BYO-key, provider allowlist, Ollama localhost guard, no key logging) but not built. When implementing it, the design must be followed precisely to avoid key logging or SSRF via Ollama host configuration.
