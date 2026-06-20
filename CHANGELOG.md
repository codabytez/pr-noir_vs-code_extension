# Changelog

## [1.0.0] - 2026-06-20

### Added
- AI-powered PR review inside VS Code using your git diff
- Support for Groq, OpenRouter, and Gemini providers (all free-tier friendly)
- Terminal Noir themed webview — dark, monospace, severity-colour coded
- Severity filtering: `CRITICAL` / `WARN` / `INFO` / `DUPLICATES`
- SHA-256 hash-based disk cache (24hr TTL) — identical diffs never re-hit the API
- Clickable `file:line` links — jump directly to flagged code in the editor
- Collapsible suggestion blocks
- Export full review as Markdown
- `PR Noir: Run AI Review` command
- `PR Noir: Export Review as Markdown` command
- Configurable max diff lines, provider, and API keys via VS Code settings
