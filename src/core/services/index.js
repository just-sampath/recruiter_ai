import config from 'config';
import DPI from 'js-dep-injector';
import { TYPES } from '../types.js';

import { GeminiEmbedding } from './GeminiEmbedding.js';
import { OpenAIEmbedding } from './OpenAIEmbedding.js';
import { QdrantService } from './Qdrant.js';
import { SparseEmbedding } from './SparseEmbedding.js';

const embeddingProvider = config.get('embedding.provider');
const vectorDBProvider = config.get('vectordb.provider');

DPI.factory(TYPES.EmbeddingService, () => {
  if (embeddingProvider === 'gemini') {
    return new GeminiEmbedding();
  }
  return new OpenAIEmbedding();
});

DPI.factory(TYPES.SparseEmbeddingService, () => new SparseEmbedding());

DPI.factory(TYPES.VectorDBService, () => {
  if (vectorDBProvider === 'qdrant') {
    return new QdrantService();
  }
  throw new Error(`Unknown vector DB provider: ${vectorDBProvider}`);
});

export { QdrantService, GeminiEmbedding, OpenAIEmbedding, SparseEmbedding };
