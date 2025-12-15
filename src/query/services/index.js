import config from 'config';
import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';

import { CohereReranker } from './Cohere.js';
import { ExplanationGenerator } from './ExplanationGenerator.js';
import { GeminiService } from './Gemini.js';
import { LLMReranker } from './LLMReranker.js';
import { OpenAIService } from './OpenAI.js';
import { QueryExtractor } from './QueryExtractor.js';

const llmProvider = config.get('llm.provider');

DPI.factory(TYPES.AIService, () => {
  if (llmProvider === 'gemini') {
    return new GeminiService();
  }
  return new OpenAIService();
});

DPI.factory(TYPES.RerankerService, () => new CohereReranker());
DPI.factory(TYPES.LLMReranker, () => new LLMReranker());
DPI.factory(TYPES.QueryExtractor, () => new QueryExtractor());
DPI.factory(TYPES.ExplanationGenerator, () => new ExplanationGenerator());

export {
  OpenAIService,
  GeminiService,
  CohereReranker,
  LLMReranker,
  QueryExtractor,
  ExplanationGenerator,
};
