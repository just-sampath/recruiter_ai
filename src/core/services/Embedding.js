import { BaseService } from './base/BaseService.js';

/**
 * Base embedding service.
 */
export class Embedding extends BaseService {
  /**
   * Generates a dense embedding vector.
   * @param {string} text - Input text.
   * @param {{type?: 'query'|'document'}} [options] - Optional embedding context.
   * @returns {Promise<number[]>} Embedding vector.
   */
  async embed(text, options = {}) {
    throw new Error('embed() not implemented');
  }
}
