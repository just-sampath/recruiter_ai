import { BaseAIService } from './base/BaseAIService.js';

/**
 * Base interface for LLM providers.
 */
export class AI extends BaseAIService {
  /**
   * Generates a structured JSON response from a prompt using the underlying provider.
   * @param {string} prompt - Prompt content.
   * @param {object} schema - JSON schema describing expected output.
   * @param {object} [options] - Additional options.
   * @param {string} [options.thinking] - Thinking level: 'fast', 'balanced', or 'accurate'.
   * @returns {Promise<any>} Parsed JSON response.
   */
  async structuredOutput(prompt, schema, options = {}) {
    throw new Error('structuredOutput() not implemented');
  }
}

