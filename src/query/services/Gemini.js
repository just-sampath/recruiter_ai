import { GoogleGenerativeAI } from '@google/generative-ai';
import { AI } from './AI.js';

/**
 * Gemini-based LLM service with responseSchema and thinking support.
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
   * @param {object} [options] - Additional options.
   * @param {string} [options.thinking] - Thinking level: 'fast', 'balanced', or 'accurate'.
   * @returns {Promise<any>} Parsed JSON.
   */
  async structuredOutput(prompt, schema, options = {}) {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const thinkingLevel = options.thinking || this.config.get('thinking.default') || 'balanced';

    const generationConfig = {
      responseMimeType: 'application/json',
      responseSchema: schema,
    };

    // Add thinking config based on model version
    const thinkingConfig = this._buildThinkingConfig(thinkingLevel);
    if (thinkingConfig) {
      generationConfig.thinkingConfig = thinkingConfig;
    }

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });
    const text = response.response?.text() || '{}';
    return JSON.parse(text);
  }

  /**
   * Builds thinking config based on model version and thinking level.
   * @param {string} level - Thinking level: 'fast', 'balanced', or 'accurate'.
   * @returns {object|null} Thinking config or null if not supported.
   */
  _buildThinkingConfig(level) {
    const modelName = this.modelName.toLowerCase();

    // Gemini 3.x uses thinkingLevel
    if (modelName.includes('gemini-3')) {
      const levelMap = this.config.get('thinking.levels') || {
        fast: 'low',
        balanced: 'high',
        accurate: 'high',
      };
      return { thinkingLevel: levelMap[level] || 'low' };
    }

    // Gemini 2.5 uses thinkingBudget
    if (modelName.includes('gemini-2.5')) {
      const budgetMap = this.config.get('thinking.budgets') || {
        fast: 1024,
        balanced: 8192,
        accurate: 24576,
      };
      return { thinkingBudget: budgetMap[level] || 8192 };
    }

    // Older models don't support thinking
    return null;
  }
}

