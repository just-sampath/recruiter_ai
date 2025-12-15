import OpenAI from 'openai';
import { AI } from './AI.js';

/**
 * OpenAI-based LLM service with structured output and reasoning support.
 */
export class OpenAIService extends AI {
  constructor() {
    super();
    const apiKey = process.env.OPENAI_API_KEY || this.config.get('llm.apiKey');
    this.modelName = this.config.get('llm.model');
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Generates JSON matching provided schema using OpenAI response_format.
   * @param {string} prompt - User prompt.
   * @param {object} schema - JSON schema.
   * @param {object} [options] - Additional options.
   * @param {string} [options.thinking] - Thinking level: 'fast', 'balanced', or 'accurate'.
   * @returns {Promise<any>} Parsed JSON.
   */
  async structuredOutput(prompt, schema, options = {}) {
    const thinkingLevel = options.thinking || this.config.get('thinking.default') || 'balanced';

    const requestParams = {
      model: this.modelName,
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'structured_output',
          schema,
        },
      },
    };

    // Add reasoning_effort for o1/o3 models
    if (this._supportsReasoning()) {
      const effortMap = { fast: 'low', balanced: 'medium', accurate: 'high' };
      requestParams.reasoning_effort = effortMap[thinkingLevel] || 'medium';
    }

    const completion = await this.client.chat.completions.create(requestParams);
    const content = completion.choices[0]?.message?.content;
    return content ? JSON.parse(content) : {};
  }

  /**
   * Checks if the current model supports reasoning_effort.
   * @returns {boolean} True if model is o1 or o3 series.
   */
  _supportsReasoning() {
    const model = this.modelName?.toLowerCase() || '';
    return model.startsWith('o1') || model.startsWith('o3') || model.startsWith("gpt-5");
  }
}

