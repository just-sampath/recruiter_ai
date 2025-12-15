import { CohereClient } from 'cohere-ai';
import { Reranker } from './Reranker.js';

/**
 * Cohere reranker v3.5 implementation.
 */
export class CohereReranker extends Reranker {
  constructor() {
    super();
    const apiKey = process.env.COHERE_API_KEY || this.config.get('reranker.apiKey');
    this.modelName = this.config.get('reranker.model') || 'rerank-english-v3.5';
    this.client = new CohereClient({ token: apiKey });
  }

  /**
   * Reranks documents with Cohere.
   * @param {string} query - Query string.
   * @param {Array<{id:string, content:string, metadata?:object}>} docs - Documents.
   * @returns {Promise<Array<{id:string, content:string, score:number, metadata?:object}>>} Reranked docs.
   */
  async rerank(query, docs) {
    if (!docs.length) {
      return [];
    }
    const response = await this.client.rerank({
      model: this.modelName,
      query,
      documents: docs.map((d) => d.content),
      returnDocuments: true,
      topN: docs.length,
    });
    return response.results.map((res, idx) => ({
      id: docs[res.index]?.id ?? String(idx),
      content: res.document?.text ?? docs[res.index]?.content ?? '',
      score: res.relevanceScore,
      metadata: docs[res.index]?.metadata,
    }));
  }
}
