import { BaseAIService } from './base/BaseAIService.js';

/**
 * Base reranker interface.
 */
export class Reranker extends BaseAIService {
  /**
   * Reranks documents against a query.
   * @param {string} query - Search query.
   * @param {Array<{id:string, content:string, metadata?:object}>} docs - Documents to rerank.
   * @returns {Promise<Array<{id:string, content:string, score:number, metadata?:object}>>}
   */
  async rerank(query, docs) {
    throw new Error('rerank() not implemented');
  }
}
