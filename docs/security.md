# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.0 (alpha) | ✅ |

## Security Design

DevForge is built with security as a core principle:

### Local-first

All tools run in your browser. No code or data is uploaded to a server. Workspace data (favorites, recents, snippets, bookmarks) persists to your browser's localStorage only.

### No SSRF

The HTTP client tool uses the browser `fetch` API directly. There is no server-side proxy, so DevForge cannot be used to make requests to internal networks on your behalf.

### Sandboxed HTML

The HTML playground renders content in an iframe with `sandbox="allow-scripts"` and no `same-origin` permission. It cannot read the DevForge page, localStorage, or your credentials.

### JWT

Decoding a JWT never proves authenticity. HMAC verification (HS256/384/512) is an explicit second step requiring a secret you supply. Asymmetric signatures (RS256, ES256) are not verified.

### Secrets

Authorization, Cookie, and token headers are redacted in reports. API keys for AI are never stored or logged (AI gateway not yet implemented).

### Plugins

Plugins are declarative manifests only. No community-supplied JavaScript can execute inside DevForge.

## Reporting a Vulnerability

If you discover a security issue, please open a private advisory or contact the maintainers directly. Do not open a public GitHub issue for security vulnerabilities.

## License

Apache-2.0.
