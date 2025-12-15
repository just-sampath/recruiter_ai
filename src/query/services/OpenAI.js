import OpenAI from 'openai';
import { AI } from './AI.js';

/**
 * OpenAI-based LLM service with structured output support.
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
   * @returns {Promise<any>} Parsed JSON.
   */
  async structuredOutput(prompt, schema) {
    const completion = await this.client.chat.completions.create({
      model: this.modelName,
      messages: [{ role: 'user', content: prompt }],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'structured_output',
          schema,
        },
      },
    });
    const content = completion.choices[0]?.message?.content;
    return content ? JSON.parse(content) : {};
  }
}
