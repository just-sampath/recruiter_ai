import axios from 'axios';
import { Embedding } from './Embedding.js';

const TASK_TYPES = {
  DOCUMENT: 'RETRIEVAL_DOCUMENT',
  QUERY: 'RETRIEVAL_QUERY',
};

/**
 * Gemini embedding service.
 */
export class GeminiEmbedding extends Embedding {
  constructor() {
    super();
    const apiKey = (
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      this.config.get('embedding.apiKey') ||
      this.config.get('llm.apiKey') ||
      ''
    ).trim();
    if (!apiKey) {
      throw new Error(
        'Gemini embedding API key missing. Set GOOGLE_API_KEY or GEMINI_API_KEY or embedding.apiKey.'
      );
    }
    this.apiKey = apiKey;
    this.modelName = this.config.get('embedding.model') || 'models/gemini-embedding-001';
    this.dimensions = this.config.get('embedding.dimensions') || null;
    this._warnedDim = false;
    const timeout = this.config.get('embedding.timeoutMs') || 30000;
    this.client = axios.create({
      baseURL: 'https://generativelanguage.googleapis.com/v1beta',
      headers: {
        'x-goog-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
      timeout,
    });
  }

  /**
   * Generates an embedding using Gemini.
   * @param {string} text - Text to embed.
   * @param {{type?: 'query'|'document'}} [options] - Embedding context type.
   * @returns {Promise<number[]>} Embedding vector.
   */
  async embed(text, options = {}) {
    const taskType = options.type === 'document' ? TASK_TYPES.DOCUMENT : TASK_TYPES.QUERY;
    const modelPath = this.modelName.startsWith('models/')
      ? this.modelName
      : `models/${this.modelName}`;
    const body = {
      task_type: taskType,
      content: { parts: [{ text }] },
    };
    if (this.dimensions) {
      body.output_dimensionality = this.dimensions;
    }
    const url = `/${modelPath}:embedContent`;
    const response = await this.client.post(url, body);
    const values = response.data?.embedding?.values;
    if (!Array.isArray(values)) {
      throw new Error('Gemini embedding response missing values');
    }
    return values;
  }
}
