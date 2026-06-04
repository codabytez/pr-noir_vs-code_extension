import { ReviewResult, ReviewComment, DuplicateBlock } from '../types';

function scoreBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  return '[' + '█'.repeat(filled) + '░'.repeat(empty) + '] ' + score + '/100';
}

function severityColor(severity: ReviewComment['severity']): string {
  switch (severity) {
    case 'critical': return '#FF4444';
    case 'warn': return '#FFAA00';
    case 'info': return '#00CC44';
  }
}

function severityBg(severity: ReviewComment['severity']): string {
  switch (severity) {
    case 'critical': return '#1A0000';
    case 'warn': return '#1A1000';
    case 'info': return '#001A08';
  }
}

function severityBorder(severity: ReviewComment['severity']): string {
  switch (severity) {
    case 'critical': return 'rgba(255,68,68,0.2)';
    case 'warn': return 'rgba(255,170,0,0.2)';
    case 'info': return 'rgba(0,204,68,0.2)';
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderComment(c: ReviewComment, idx: number): string {
  const color = severityColor(c.severity);
  const bg = severityBg(c.severity);
  const border = severityBorder(c.severity);
  const typeTag = `[${c.type.toUpperCase()}]`;
  const fileLink = c.line
    ? `<a class="file-link" onclick="openFile('${escapeHtml(c.file)}', ${c.line})">${escapeHtml(c.file)}:${c.line}</a>`
    : `<span class="muted">${escapeHtml(c.file)}</span>`;

  const suggestionBlock = c.suggestion
    ? `<div class="suggestion-toggle" onclick="toggleSuggestion('sug-${idx}')">▸ SUGGESTION</div>
       <pre class="suggestion-body" id="sug-${idx}" style="display:none">${escapeHtml(c.suggestion)}</pre>`
    : '';

  return `
    <div class="card" data-severity="${c.severity}">
      <div class="card-header">
        <span class="badge" style="color:${color};background:${bg};border:1px solid ${border};">${c.severity.toUpperCase()}</span>
        <span class="type-tag" style="color:${color};">${typeTag}</span>
        <span class="file-ref">${fileLink}</span>
      </div>
      <div class="card-title">${escapeHtml(c.title)}</div>
      <div class="card-desc">${escapeHtml(c.description)}</div>
      ${suggestionBlock}
    </div>`;
}

function renderDuplicate(d: DuplicateBlock, idx: number): string {
  const filesHtml = d.files.map(f => `<span class="code-inline">${escapeHtml(f)}</span>`).join(' ↔ ');
  const rangesHtml = d.lineRanges.map(r => `<span class="code-inline">${escapeHtml(r)}</span>`).join(', ');
  return `
    <div class="card dupe-card">
      <div class="card-header">
        <span class="badge" style="color:#FFAA00;background:#1A1000;border:1px solid rgba(255,170,0,0.2);">DUPLICATE</span>
        <span class="type-tag" style="color:#FFAA00;">[BLOCK ${idx + 1}]</span>
      </div>
      <div class="card-title">${escapeHtml(d.description)}</div>
      <div class="card-desc">Files: ${filesHtml}</div>
      ${rangesHtml ? `<div class="card-desc muted">Lines: ${rangesHtml}</div>` : ''}
    </div>`;
}

export function getWebviewContent(result: ReviewResult | null, isLoading: boolean, provider = 'groq'): string {
  const baseStyles = `
    <style>
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      :root {
        --bg: #080808;
        --card-bg: #111111;
        --topbar-bg: #0D0D0D;
        --green: #00CC44;
        --warn: #FFAA00;
        --critical: #FF4444;
        --muted: #555555;
        --border: #1E1E1E;
        --text: #AAAAAA;
        --font: 'Courier New', monospace;
      }

      body {
        background: var(--bg);
        color: var(--text);
        font-family: var(--font);
        font-size: 13px;
        line-height: 1.6;
        min-height: 100vh;
      }

      body::after {
        content: '';
        position: fixed;
        inset: 0;
        background: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,0.03) 2px,
          rgba(0,0,0,0.03) 4px
        );
        pointer-events: none;
        z-index: 9999;
      }

      a { color: var(--green); text-decoration: none; cursor: pointer; }
      a:hover { text-decoration: underline; }
      .muted { color: var(--muted); }

      /* TOP BAR */
      .topbar {
        background: var(--topbar-bg);
        border-bottom: 1px solid var(--border);
        padding: 10px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        position: sticky;
        top: 0;
        z-index: 100;
      }
      .topbar-title {
        color: var(--green);
        font-size: 14px;
        font-weight: bold;
        letter-spacing: 2px;
      }
      .topbar-score {
        color: var(--green);
        font-size: 12px;
        margin-left: auto;
      }
      .cached-badge {
        color: var(--green);
        border: 1px solid rgba(0,204,68,0.3);
        background: rgba(0,204,68,0.08);
        padding: 1px 6px;
        font-size: 11px;
      }
      .topbar-ts {
        color: var(--muted);
        font-size: 11px;
      }

      /* MAIN CONTENT */
      .container { padding: 16px; max-width: 900px; }

      /* SUMMARY */
      .summary-block {
        border: 1px solid var(--border);
        background: var(--card-bg);
        padding: 12px 14px;
        margin-bottom: 14px;
      }
      .summary-label { color: var(--muted); font-size: 11px; margin-bottom: 4px; }
      .summary-text { color: var(--text); }

      /* SCORE METER */
      .score-meter {
        margin-bottom: 14px;
        padding: 10px 14px;
        border: 1px solid var(--border);
        background: var(--card-bg);
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .score-label { color: var(--muted); font-size: 11px; min-width: 50px; }
      .score-bar { color: var(--green); font-size: 13px; letter-spacing: 1px; }

      /* STATS ROW */
      .stats-row {
        display: flex;
        gap: 12px;
        margin-bottom: 14px;
        flex-wrap: wrap;
      }
      .stat-pill {
        padding: 4px 12px;
        border: 1px solid var(--border);
        background: var(--card-bg);
        font-size: 12px;
      }
      .stat-pill.critical { color: var(--critical); border-color: rgba(255,68,68,0.2); }
      .stat-pill.warn { color: var(--warn); border-color: rgba(255,170,0,0.2); }
      .stat-pill.info { color: var(--green); border-color: rgba(0,204,68,0.2); }
      .stat-pill.dupes { color: #FFAA00; border-color: rgba(255,170,0,0.2); }

      /* FILTER TABS */
      .filter-tabs {
        display: flex;
        gap: 0;
        margin-bottom: 14px;
        border: 1px solid var(--border);
        width: fit-content;
      }
      .tab {
        padding: 5px 14px;
        cursor: pointer;
        font-family: var(--font);
        font-size: 12px;
        color: var(--muted);
        background: var(--card-bg);
        border: none;
        border-right: 1px solid var(--border);
        letter-spacing: 1px;
        transition: color 0.1s, background 0.1s;
      }
      .tab:last-child { border-right: none; }
      .tab:hover { color: var(--text); }
      .tab.active { color: var(--green); background: rgba(0,204,68,0.06); }

      /* CARDS */
      .card {
        border: 1px solid var(--border);
        border-left: 2px solid var(--border);
        background: var(--card-bg);
        padding: 12px 14px;
        margin-bottom: 8px;
        transition: border-left-color 0.15s;
      }
      .card:hover { border-left-color: var(--green); }
      .card-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
        flex-wrap: wrap;
      }
      .badge {
        font-size: 10px;
        padding: 1px 6px;
        letter-spacing: 1px;
      }
      .type-tag { font-size: 11px; letter-spacing: 1px; }
      .file-ref { font-size: 11px; margin-left: auto; }
      .file-link { cursor: pointer; color: var(--green); }
      .file-link:hover { text-decoration: underline; }
      .card-title {
        color: #CCCCCC;
        font-size: 13px;
        font-weight: bold;
        margin-bottom: 4px;
      }
      .card-desc { color: var(--text); font-size: 12px; line-height: 1.5; }

      /* SUGGESTION */
      .suggestion-toggle {
        color: var(--green);
        font-size: 11px;
        margin-top: 8px;
        cursor: pointer;
        letter-spacing: 1px;
        user-select: none;
      }
      .suggestion-toggle:hover { text-decoration: underline; }
      .suggestion-body {
        background: #0A0A0A;
        border: 1px solid var(--border);
        color: var(--green);
        font-family: var(--font);
        font-size: 12px;
        padding: 10px;
        margin-top: 6px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
      }

      /* SECTION HEADER */
      .section-header {
        color: var(--muted);
        font-size: 11px;
        letter-spacing: 2px;
        margin-bottom: 8px;
        margin-top: 16px;
        padding-bottom: 4px;
        border-bottom: 1px solid var(--border);
      }

      /* DUPE CARD */
      .dupe-card:hover { border-left-color: var(--warn); }
      .code-inline {
        background: #0A0A0A;
        border: 1px solid var(--border);
        color: var(--warn);
        padding: 1px 5px;
        font-family: var(--font);
        font-size: 11px;
      }

      /* EMPTY STATE */
      .empty-state {
        color: var(--green);
        font-size: 16px;
        padding: 40px 16px;
        letter-spacing: 2px;
        text-align: center;
      }

      /* EXPORT BUTTON */
      .export-btn {
        display: inline-block;
        margin-top: 20px;
        margin-bottom: 20px;
        padding: 7px 18px;
        border: 1px solid var(--green);
        color: var(--green);
        background: rgba(0,204,68,0.05);
        cursor: pointer;
        font-family: var(--font);
        font-size: 12px;
        letter-spacing: 1px;
        transition: background 0.15s;
      }
      .export-btn:hover { background: rgba(0,204,68,0.12); }

      /* LOADING */
      .loading-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
        flex-direction: column;
        gap: 12px;
      }
      .loading {
        color: var(--green);
        font-size: 18px;
        letter-spacing: 3px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
      .cursor { animation: blink 1s step-end infinite; }
    </style>`;

  if (isLoading) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${baseStyles}</head>
<body>
  <div class="topbar">
    <span class="topbar-title">PR-NOIR</span>
  </div>
  <div class="loading-wrap">
    <div class="loading">
      <span>▸ SCANNING DIFF</span><span class="cursor">_</span>
    </div>
    <div class="muted" style="font-size:11px;letter-spacing:1px;">contacting ${provider} api...</div>
  </div>
</body>
</html>`;
  }

  if (!result) {
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8">${baseStyles}</head>
<body>
  <div class="topbar"><span class="topbar-title">PR-NOIR</span></div>
  <div class="empty-state">▸ NO RESULTS</div>
</body>
</html>`;
  }

  const criticalCount = result.comments.filter(c => c.severity === 'critical').length;
  const warnCount = result.comments.filter(c => c.severity === 'warn').length;
  const infoCount = result.comments.filter(c => c.severity === 'info').length;
  const dupeCount = result.duplicates.length;
  const ts = new Date(result.timestamp).toLocaleTimeString();

  const commentsHtml = result.comments.map((c, i) => renderComment(c, i)).join('');
  const dupesHtml = result.duplicates.map((d, i) => renderDuplicate(d, i)).join('');

  const noIssues = result.comments.length === 0 && result.duplicates.length === 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  ${baseStyles}
</head>
<body>
  <div class="topbar">
    <span class="topbar-title">PR-NOIR</span>
    ${result.cached ? '<span class="cached-badge">[CACHED]</span>' : ''}
    <span class="topbar-score">${scoreBar(result.score)}</span>
    <span class="topbar-ts">${ts}</span>
  </div>

  <div class="container">
    <div class="summary-block">
      <div class="summary-label">▸ SUMMARY</div>
      <div class="summary-text">${escapeHtml(result.summary)}</div>
    </div>

    <div class="score-meter">
      <span class="score-label muted">SCORE</span>
      <span class="score-bar">${scoreBar(result.score)}</span>
    </div>

    <div class="stats-row">
      <span class="stat-pill critical">CRITICAL: ${criticalCount}</span>
      <span class="stat-pill warn">WARN: ${warnCount}</span>
      <span class="stat-pill info">INFO: ${infoCount}</span>
      <span class="stat-pill dupes">DUPES: ${dupeCount}</span>
    </div>

    ${noIssues ? '<div class="empty-state">▸ NO ISSUES DETECTED</div>' : `
    <div class="filter-tabs">
      <button class="tab active" onclick="filterCards('all', this)">ALL</button>
      <button class="tab" onclick="filterCards('critical', this)">CRITICAL</button>
      <button class="tab" onclick="filterCards('warn', this)">WARN</button>
      <button class="tab" onclick="filterCards('info', this)">INFO</button>
      <button class="tab" onclick="filterCards('duplicates', this)">DUPLICATES</button>
    </div>

    <div id="comments-section">
      ${result.comments.length > 0 ? `<div class="section-header">FINDINGS</div>${commentsHtml}` : ''}
    </div>

    <div id="dupes-section">
      ${dupesHtml ? `<div class="section-header">DUPLICATE BLOCKS</div>${dupesHtml}` : ''}
    </div>
    `}

    <button class="export-btn" onclick="exportMd()">▸ EXPORT AS MARKDOWN</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function openFile(file, line) {
      vscode.postMessage({ command: 'openFile', file, line });
    }

    function exportMd() {
      vscode.postMessage({ command: 'exportMarkdown' });
    }

    function toggleSuggestion(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }

    function filterCards(filter, btn) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');

      const cards = document.querySelectorAll('.card:not(.dupe-card)');
      const dupeSection = document.getElementById('dupes-section');
      const commentsSection = document.getElementById('comments-section');

      if (filter === 'duplicates') {
        cards.forEach(c => { c.style.display = 'none'; });
        if (commentsSection) {
          commentsSection.querySelectorAll('.section-header').forEach(h => { h.style.display = 'none'; });
        }
        if (dupeSection) dupeSection.style.display = 'block';
      } else {
        if (dupeSection) {
          if (filter === 'all') {
            dupeSection.style.display = 'block';
          } else {
            dupeSection.style.display = 'none';
          }
        }
        if (commentsSection) {
          commentsSection.querySelectorAll('.section-header').forEach(h => { h.style.display = ''; });
        }
        cards.forEach(c => {
          const severity = c.getAttribute('data-severity');
          c.style.display = (filter === 'all' || severity === filter) ? 'block' : 'none';
        });
      }
    }
  </script>
</body>
</html>`;
}
