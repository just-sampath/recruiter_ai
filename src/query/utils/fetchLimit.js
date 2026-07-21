/**
 * Shared fetch-limit for hybrid and semantic vector retrieval before rerank.
 * @param {number} topK
 * @param {{ get: (key: string) => unknown }} config
 * @returns {number}
 */
export function rerankFetchLimit(topK, config) {
  const mult = config.get('search.rerankFetchMultiplier') ?? 25;
  return Math.max(topK * mult, 80);
}
