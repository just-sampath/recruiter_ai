import { TYPES } from '../../core/types.js';
import { BaseAIService } from './base/BaseAIService.js';

/**
 * JSON schema for LLM reranking structured output.
 */
const RERANK_SCHEMA = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          candidate_id: {
            type: 'number',
            description: 'Candidate ID from the document',
          },
          relevance_score: {
            type: 'number',
            description: 'Relevance score from 0.0 to 1.0',
          },
          explanation: {
            type: 'string',
            description: 'Brief explanation of why this candidate matches the query',
          },
        },
        required: ['candidate_id', 'relevance_score', 'explanation'],
      },
    },
  },
  required: ['candidates'],
};

/**
 * LLM-based reranker that semantically evaluates candidates against query.
 */
export class LLMReranker extends BaseAIService {
  /**
   * Reranks documents using LLM semantic understanding.
   * @param {string} query - Search query.
   * @param {Array<{id:string, content:string, metadata:object}>} docs - Retrieved documents with full payload.
   * @param {number} topK - Number of top candidates to return.
   * @param {object} [options] - Additional options.
   * @param {string} [options.thinking] - Thinking level: 'fast', 'balanced', or 'accurate'.
   * @returns {Promise<Array<{candidate_id:number, match_score:number, explanation:string}>>} Reranked candidates with explanations.
   */
  async rerank(query, docs, topK, options = {}) {
    const logger = this.logger;
    logger.info({ query, docCount: docs.length, topK }, 'LLMReranker: starting');

    if (!docs.length) {
      return [];
    }

    try {
      const prompt = this._buildPrompt(query, docs, topK);
      const ai = this.dpi.get(TYPES.AIService);
      const startTime = Date.now();

      const result = await ai.structuredOutput(prompt, RERANK_SCHEMA, options);
      const latencyMs = Date.now() - startTime;

      logger.info({ resultCount: result.candidates?.length, latencyMs }, 'LLMReranker: complete');

      return (result.candidates || []).slice(0, topK).map((c) => ({
        candidate_id: Number(c.candidate_id),
        match_score: Math.min(1, Math.max(0, Number(c.relevance_score) || 0)),
        explanation: c.explanation || '',
      }));
    } catch (err) {
      logger.error({ err }, 'LLMReranker: failed');
      throw err;
    }
  }

  /**
   * Builds the reranking prompt.
   * @param {string} query - Search query.
   * @param {Array} docs - Documents to rerank.
   * @param {number} topK - Number to return.
   * @returns {string} Formatted prompt.
   */
  _buildPrompt(query, docs, topK) {
    // Group documents by candidate for cleaner presentation
    const candidateMap = new Map();
    docs.forEach((doc) => {
      const cid = doc.metadata?.candidate_id;
      if (!cid) return;
      if (!candidateMap.has(cid)) {
        candidateMap.set(cid, {
          candidate_id: cid,
          documents: [],
          metadata: doc.metadata,
        });
      }
      candidateMap.get(cid).documents.push({
        doc_type: doc.metadata?.doc_type,
        text: doc.metadata?.embedded_text || doc.content || '',
      });
    });

    const candidates = Array.from(candidateMap.values());

    const candidateBlocks = candidates
      .map((c) => {
        const docTexts = c.documents
          .map((d) => `[${d.doc_type}]: ${d.text.slice(0, 2000)}`)
          .join('\n\n');

        return `--- CANDIDATE ID: ${c.candidate_id} ---
Current Title: ${c.metadata?.current_title || 'N/A'}
Current Company: ${c.metadata?.current_company || 'N/A'}
Current Location: ${c.metadata?.current_location || 'N/A'}
Experience: ${c.metadata?.total_experience_years || 'N/A'} years
Added Skills: ${(c.metadata?.skills || []).join(', ') || 'N/A'}
Notice Period (days): ${c.metadata?.notice_period_days || 'N/A'}
Can Join Immediately: ${c.metadata?.can_join_immediately || 'N/A'}
Expected Salary (LPA): ${c.metadata?.expected_salary_lpa || 'N/A'}
Preferred Work Type: ${c.metadata?.preferred_work_type || 'N/A'}

DOCUMENTS:
${docTexts}
--- END CANDIDATE ID: ${c.candidate_id} ---`;
      })
      .join('\n\n');

    return `You are a recruiting assistant evaluating candidate relevance.

SEARCH QUERY: "${query}"

Evaluate the following ${candidates.length} candidates and rank them by relevance to the query.
Return the top ${topK} most relevant candidates with scores and brief explanations.

${candidateBlocks}

INSTRUCTIONS:
1. Read each candidate's documents (resume, transcripts, comments) carefully
2. Evaluate strict relevance to the search query - not just keyword matches
3. Consider skills, experience, and qualitative aspects mentioned in documents
4. Assign relevance_score from 0.0 (irrelevant) to 1.0 (perfect match)
5. Write a concise explanation (1-2 sentences) for each candidate
6. Return candidates sorted by relevance_score descending

Return JSON with exactly ${Math.min(topK, candidates.length)} candidates.`;
  }
}
