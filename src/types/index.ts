export interface ReviewComment {
  id: string;
  severity: 'info' | 'warn' | 'critical';
  type: 'smell' | 'refactor' | 'duplicate' | 'security' | 'style';
  file: string;
  line: number | null;
  title: string;
  description: string;
  suggestion: string | null;
}

export interface ReviewResult {
  score: number;
  summary: string;
  comments: ReviewComment[];
  duplicates: DuplicateBlock[];
  cached: boolean;
  timestamp: number;
  diffHash: string;
}

export interface DuplicateBlock {
  id: string;
  files: string[];
  description: string;
  lineRanges: string[];
}

export interface CacheEntry {
  hash: string;
  result: ReviewResult;
  createdAt: number;
}

export interface GeminiRequest {
  contents: Array<{
    parts: Array<{ text: string }>;
  }>;
  generationConfig: {
    responseMimeType: 'application/json';
    temperature: number;
    maxOutputTokens: number;
  };
}

export interface OpenAIRequest {
  model: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
  temperature: number;
  max_tokens: number;
  response_format?: { type: 'json_object' };
}

export type Provider = 'gemini' | 'groq' | 'openrouter';
