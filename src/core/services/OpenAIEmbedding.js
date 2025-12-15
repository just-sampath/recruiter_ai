import OpenAI from 'openai';
import { Embedding } from './Embedding.js';

/**
 * OpenAI embedding service.
 */
export class OpenAIEmbedding extends Embedding {
  constructor() {
    super();
    const apiKey = process.env.OPENAI_API_KEY || this.config.get('embedding.apiKey');
    this.modelName = this.config.get('embedding.model') || 'text-embedding-3-small';
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generates an embedding using OpenAI.
   * @param {string} text - Text to embed.
   * @param {{type?: 'query'|'document'}} [options] - Unused, for API parity.
   * @returns {Promise<number[]>} Embedding vector.
   */
  async embed(text, _options = {}) {
    const response = await this.client.embeddings.create({
      model: this.modelName,
      input: text,
    });
    return response.data[0].embedding;
  }
}
