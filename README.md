# PR Noir — AI PR Review

Terminal Noir AI-powered code review inside VS Code. Scans your git diff and returns a full review — scores, severity-tagged findings, duplicate detection, and inline suggestions — all inside a dark, monospace webview panel.

## Features

- Scans your git diff (staged → unstaged → HEAD~1 fallback)
- Powered by **Groq**, **OpenRouter**, or **Gemini** — your choice
- Terminal Noir themed webview (dark, monospace, green/amber/red)
- SHA-256 hash-based disk cache (24hr TTL) — identical diffs never re-hit the API
- Filter findings by severity: `CRITICAL` / `WARN` / `INFO` / `DUPLICATES`
- Clickable `file:line` links — jump directly to flagged code in the editor
- Collapsible suggestion blocks
- Export full review as Markdown

## Setup

### 1. Pick a provider and get a free API key

| Provider           | Free Tier                    | Get Key                                            |
| ------------------ | ---------------------------- | -------------------------------------------------- |
| **Groq** (default) | 14,400 req/day               | [console.groq.com](https://console.groq.com)       |
| **OpenRouter**     | Free models available        | [openrouter.ai](https://openrouter.ai)             |
| **Gemini**         | Free tier (region-dependent) | [aistudio.google.com](https://aistudio.google.com) |

### 2. Configure in VS Code

Open settings (`Cmd+,`) and search **PR Noir**, then set:

- `prNoir.provider` — choose `groq`, `openrouter`, or `gemini`
- Paste your key into the matching key field

## Usage

- `Cmd+Shift+P` → **PR Noir: Run AI Review**
- Or click the search icon in the editor title bar
- To export: `Cmd+Shift+P` → **PR Noir: Export Review as Markdown**

## Configuration

| Setting                   | Default | Description                                    |
| ------------------------- | ------- | ---------------------------------------------- |
| `prNoir.provider`         | `groq`  | AI provider: `groq`, `openrouter`, or `gemini` |
| `prNoir.groqApiKey`       | `""`    | Groq API key                                   |
| `prNoir.openrouterApiKey` | `""`    | OpenRouter API key                             |
| `prNoir.geminiApiKey`     | `""`    | Gemini API key                                 |
| `prNoir.cacheEnabled`     | `true`  | Cache responses locally (24hr TTL)             |
| `prNoir.maxDiffLines`     | `500`   | Max diff lines sent to AI                      |

## Development

```bash
pnpm install
pnpm run compile
# Press F5 to launch the Extension Development Host
```

## CI/CD

- Every push to `main` → compiles and packages a VSIX (available as a workflow artifact)
- Bump the version in `package.json` and push → auto-creates a GitHub Release with the VSIX attached

---

_PR-Noir v1.0.0 — codabytez — Terminal Noir Edition_
