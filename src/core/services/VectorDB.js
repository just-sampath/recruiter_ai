import { BaseService } from './base/BaseService.js';

/**
 * Base vector database service.
 */
export class VectorDB extends BaseService {
  /**
   * Ensures the backing collection exists.
   * @returns {Promise<void>}
   */
  async ensureCollection() {
    throw new Error('ensureCollection() not implemented');
  }

  /**
   * Upserts points into the vector store.
   * @param {Array<object>} points - Points with id, vector, payload.
   * @returns {Promise<void>}
   */
  async upsert(points) {
    throw new Error('upsert() not implemented');
  }

  /**
   * Executes a hybrid search using dense and sparse vectors.
   * @param {object} params - Search params.
   * @param {number[]} params.dense - Dense vector.
   * @param {{indices: number[], values: number[]}} params.sparse - Sparse vector.
   * @param {object} [params.filter] - Optional payload filter.
   * @param {number} [params.limit] - Max results.
   * @returns {Promise<Array<object>>} Search hits with payload.
   */
  async hybridSearch(params) {
    throw new Error('hybridSearch() not implemented');
  }
}
