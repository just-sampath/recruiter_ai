import { TYPES } from '../../core/types.js';
import { BaseAIService } from './base/BaseAIService.js';

const explanationSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      candidate_id: { type: 'number' },
      explanation: { type: 'string' },
    },
    required: ['candidate_id', 'explanation'],
  },
};

/**
 * Generates short explanations for reranked results.
 */
export class ExplanationGenerator extends BaseAIService {
  /**
   * Generates explanations via LLM.
   * @param {string} query - Recruiter query.
   * @param {Array<{candidate_id:number, content:string, score:number, matched_on:string}>} results - Reranked results.
   * @param {object} [options] - Additional options.
   * @param {string} [options.thinking] - Thinking level: 'fast', 'balanced', or 'accurate'.
   * @returns {Promise<Array<{candidate_id:number, explanation:string}>>} Explanations keyed by candidate_id.
   */
  async generate(query, results, options = {}) {
    if (!results.length) {
      return [];
    }
    const snippets = results
      .map((r) => {
        const preview = r.content ? r.content.slice(0, 400) : '';
        const matchedOn = r.matched_on ? `matched_on=${r.matched_on}` : '';
        return `Candidate ${r.candidate_id} (score ${r.score.toFixed(3)} ${matchedOn}): ${preview}`;
      })
      .join('\n');
    const prompt = [
      'You are ranking candidates for a recruiter.',
      'Given the query and snippets, produce 1-2 sentence explanations per candidate highlighting why they match.',
      'Be concise and specific.',
      `Query: ${query}`,
      `Snippets:\n${snippets}`,
    ].join('\n');

    const ai = this.dpi.get(TYPES.AIService);
    const output = await ai.structuredOutput(prompt, explanationSchema, options);
    return Array.isArray(output) ? output : [];
  }
}

