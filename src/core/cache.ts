import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { CacheEntry, ReviewResult } from '../types';

const CACHE_DIR = path.join(os.tmpdir(), 'pr-noir-cache');
const TTL_MS = 24 * 60 * 60 * 1000;

export function hashDiff(diff: string): string {
  return crypto.createHash('sha256').update(diff).digest('hex');
}

export function getCached(hash: string): ReviewResult | null {
  const file = path.join(CACHE_DIR, `${hash}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const entry: CacheEntry = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Date.now() - entry.createdAt > TTL_MS) {
      fs.unlinkSync(file);
      return null;
    }
    return { ...entry.result, cached: true };
  } catch { return null; }
}

export function setCache(hash: string, result: ReviewResult): void {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  const entry: CacheEntry = { hash, result, createdAt: Date.now() };
  fs.writeFileSync(
    path.join(CACHE_DIR, `${hash}.json`),
    JSON.stringify(entry),
    'utf8'
  );
}

export function clearCache(): void {
  if (fs.existsSync(CACHE_DIR)) {
    fs.readdirSync(CACHE_DIR).forEach(f =>
      fs.unlinkSync(path.join(CACHE_DIR, f))
    );
  }
}
