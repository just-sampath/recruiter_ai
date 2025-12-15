import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI } from './AI.js';

/**
 * Gemini-based LLM service with responseSchema support.
 */
export class GeminiService extends AI {
  constructor() {
    super();
    const apiKey = process.env.GOOGLE_API_KEY || this.config.get('llm.apiKey');
    this.modelName = this.config.get('llm.model') || 'gemini-1.5-pro';
    this.client = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Generates structured JSON via Gemini responseSchema.
   * @param {string} prompt - Prompt text.
   * @param {object} schema - JSON schema.
   * @returns {Promise<any>} Parsed JSON.
   */
  async structuredOutput(prompt, schema) {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });
    const text = response.response?.text() || '{}';
    return JSON.parse(text);
  }
}
