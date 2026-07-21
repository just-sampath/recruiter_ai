/**
 * Normalize path-specific scores to the API contract range [0, 1].
 */

/**
 * Clamp a number to [0, 1]. Non-finite values become 0.
 * @param {unknown} n
 * @returns {number}
 */
export function clamp01(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return 0;
  return Math.min(1, Math.max(0, x));
}

/**
 * Structured deterministic scores are raw 0..100.
 * @param {unknown} score
 * @returns {number}
 */
export function normalizeStructured(score) {
  return clamp01(score / 100);
}

/**
 * Cohere / LLM relevance scores are already 0..1.
 * @param {unknown} score
 * @returns {number}
 */
export function normalizeRelevance(score) {
  return clamp01(score);
}
