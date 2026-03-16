/**
 * In-memory LRU cache for solved math problems.
 * Avoids re-calling edge functions for previously solved queries.
 */

import type { FormattedSolution } from "./solutionFormatter";

interface CacheEntry {
  solution: FormattedSolution;
  timestamp: number;
}

const MAX_CACHE_SIZE = 50;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

const cache = new Map<string, CacheEntry>();

function normalizeKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, " ");
}

export function getCachedSolution(query: string): FormattedSolution | null {
  const key = normalizeKey(query);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  // Move to end (most recently used)
  cache.delete(key);
  cache.set(key, entry);
  return entry.solution;
}

export function cacheSolution(query: string, solution: FormattedSolution): void {
  const key = normalizeKey(query);
  // Evict oldest if at capacity
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { solution, timestamp: Date.now() });
}

export function clearCache(): void {
  cache.clear();
}
