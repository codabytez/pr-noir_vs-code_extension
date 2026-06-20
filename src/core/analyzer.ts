import * as vscode from 'vscode';
import { ReviewResult, GeminiRequest, OpenAIRequest, Provider } from '../types';
import { hashDiff, getCached, setCache } from './cache';

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/' +
  'gemini-2.0-flash-lite:generateContent';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OPENROUTER_MODEL = 'google/gemini-2.0-flash-exp:free';

function buildPrompt(diff: string): string {
  return `You are an expert code reviewer. Analyze the following git diff and return ONLY valid JSON (no markdown, no explanation). The JSON must match this exact schema:

{
  "score": <number 0-100>,
  "summary": "<one sentence summary>",
  "comments": [
    {
      "id": "<uuid>",
      "severity": "info|warn|critical",
      "type": "smell|refactor|duplicate|security|style",
      "file": "<filename>",
      "line": <number or null>,
      "title": "<short title>",
      "description": "<detailed description>",
      "suggestion": "<code suggestion or null>"
    }
  ],
  "duplicates": [
    {
      "id": "<uuid>",
      "files": ["<file1>", "<file2>"],
      "description": "<what is duplicated>",
      "lineRanges": ["<range1>", "<range2>"]
    }
  ]
}

Git diff to review:
\`\`\`
${diff}
\`\`\`
Return ONLY the JSON object. No markdown fences. No explanation.`;
}

async function callGemini(apiKey: string, diff: string): Promise<string> {
  const body: GeminiRequest = {
    contents: [{ parts: [{ text: buildPrompt(diff) }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 8192,
    }
  };

  let response: Response;
  try {
    response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err: unknown) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(`Network error reaching Gemini API: ${cause}`, { cause: err });
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const raw = await response.json() as Record<string, unknown>;
  const candidates = raw?.candidates as Array<Record<string, unknown>> | undefined;
  const parts = (candidates?.[0]?.content as Record<string, unknown> | undefined)
    ?.parts as Array<Record<string, unknown>> | undefined;
  return (parts?.[0]?.text as string) ?? '';
}

async function callOpenAICompat(
  url: string,
  apiKey: string,
  model: string,
  diff: string,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const body: OpenAIRequest = {
    model,
    messages: [{ role: 'user', content: buildPrompt(diff) }],
    temperature: 0.2,
    max_tokens: 8192,
    response_format: { type: 'json_object' },
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });
  } catch (err: unknown) {
    const cause = err instanceof Error ? err.message : String(err);
    throw new Error(`Network error: ${cause}`, { cause: err });
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const raw = await response.json() as Record<string, unknown>;
  const choices = raw?.choices as Array<Record<string, unknown>> | undefined;
  const message = choices?.[0]?.message as Record<string, unknown> | undefined;
  return (message?.content as string) ?? '';
}

export async function analyzeWithAI(diff: string): Promise<ReviewResult> {
  const config = vscode.workspace.getConfiguration('prNoir');
  const provider = config.get<Provider>('provider', 'groq');
  const cacheEnabled: boolean = config.get('cacheEnabled', true);

  const hash = hashDiff(diff);

  if (cacheEnabled) {
    const cached = getCached(hash);
    if (cached) return cached;
  }

  let text: string;

  if (provider === 'gemini') {
    const apiKey: string = config.get('geminiApiKey', '');
    if (!apiKey) throw new Error('No Gemini API key. Set prNoir.geminiApiKey in VS Code settings.');
    text = await callGemini(apiKey, diff);

  } else if (provider === 'groq') {
    const apiKey: string = config.get('groqApiKey', '');
    if (!apiKey) throw new Error('No Groq API key. Set prNoir.groqApiKey in VS Code settings. Get a free key at console.groq.com');
    text = await callOpenAICompat(GROQ_URL, apiKey, GROQ_MODEL, diff);

  } else {
    const apiKey: string = config.get('openrouterApiKey', '');
    if (!apiKey) throw new Error('No OpenRouter API key. Set prNoir.openrouterApiKey in VS Code settings. Get a free key at openrouter.ai');
    text = await callOpenAICompat(OPENROUTER_URL, apiKey, OPENROUTER_MODEL, diff, {
      'HTTP-Referer': 'https://github.com/codabytez/pr-noir',
      'X-Title': 'PR Noir',
    });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    throw new Error('Failed to parse AI response as JSON');
  }

  const result: ReviewResult = {
    score: (parsed.score as number) ?? 0,
    summary: (parsed.summary as string) ?? '',
    comments: (parsed.comments as ReviewResult['comments']) ?? [],
    duplicates: (parsed.duplicates as ReviewResult['duplicates']) ?? [],
    cached: false,
    timestamp: Date.now(),
    diffHash: hash,
  };

  if (cacheEnabled) setCache(hash, result);
  return result;
}
