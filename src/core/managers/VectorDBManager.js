import { TYPES } from '../types.js';
import { CoreBaseManager } from './base/CoreBaseManager.js';

/**
 * Thin wrapper around vector DB service for convenience.
 */
export class VectorDBManager extends CoreBaseManager {
  /**
   * Ensures collection exists.
   * @returns {Promise<void>}
   */
  async ensureCollection() {
    await this.dpi.get(TYPES.VectorDBService).ensureCollection();
  }

  /**
   * Upserts provided points.
   * @param {Array<object>} points - Vector points.
   * @returns {Promise<void>}
   */
  async upsert(points) {
    await this.dpi.get(TYPES.VectorDBService).upsert(points);
  }

  /**
   * Executes hybrid search.
   * @param {object} params - Search params.
   * @returns {Promise<Array<object>>} Search results.
   */
  async hybridSearch(params) {
    return this.dpi.get(TYPES.VectorDBService).hybridSearch(params);
  }
}
