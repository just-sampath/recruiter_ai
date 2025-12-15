import fs from 'node:fs/promises';
import path from 'node:path';
import { BaseService } from './base/BaseService.js';

/**
 * Sparse embedding service backed by local ONNX/BM42 model with tokenizer fallback.
 */
export class SparseEmbedding extends BaseService {
  constructor() {
    super();
    const cfg = this.config.get('sparseEmbedding');
    this.modelPath = cfg.modelPath;
    this.tokenizerPath = cfg.tokenizerPath;
    this.stopwordsPath = cfg.stopwordsPath;
    this.initialized = false;
    this.vocab = new Map();
    this.stopwords = new Set();
    this.bm42 = null;
  }

  /**
   * Lazily loads tokenizer, stopwords, and optional BM42 runtime.
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) {
      return;
    }
    const tokenizerFile = path.resolve(this.tokenizerPath);
    const stopwordsFile = path.resolve(this.stopwordsPath);
    const tokenizerContent = await fs.readFile(tokenizerFile, 'utf-8');
    const tokenizerJson = JSON.parse(tokenizerContent);
    const vocabEntries = Object.entries(tokenizerJson.model?.vocab || {});
    vocabEntries.forEach(([token, idx]) => {
      this.vocab.set(token, idx);
    });
    try {
      const stopwordsContent = await fs.readFile(stopwordsFile, 'utf-8');
      stopwordsContent
        .split(/\r?\n/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
        .forEach((w) => this.stopwords.add(w));
    } catch (err) {
      this.logger.warn({ err }, 'Stopwords file not found; continuing without stopword removal');
    }
    await this._maybeLoadBm42();
    this.initialized = true;
  }

  /**
   * Attempts to load BM42 for higher quality sparse embeddings.
   * @returns {Promise<void>}
   */
  async _maybeLoadBm42() {
    const cfg = this.config.get('sparseEmbedding') || {};
    const enableBm42 = process.env.BM42_ENABLE === 'true' || cfg.useBm42 === true;
    if (!enableBm42) {
      this.logger.info('BM42 disabled; using tokenizer-based sparse embeddings');
      return;
    }
    try {
      const mod = await import('@anush008/bm42');
      const BM42 = mod?.BM42 || mod?.default || mod;
      if (BM42) {
        const cacheDir = this.modelPath ? path.dirname(path.resolve(this.modelPath)) : undefined;
        this.bm42 = new BM42({
          cacheDir,
          showDownloadProgress: false,
        });
        this.logger.info({ cacheDir }, 'Loaded BM42 sparse embedding runtime');
      } else {
        this.logger.warn(
          'BM42 runtime present but constructor unavailable; using tokenizer fallback'
        );
      }
    } catch (err) {
      this.logger.warn(
        { err },
        'BM42 runtime unavailable, using lightweight tokenizer-based sparse embeddings'
      );
    }
  }

  /**
   * Generates sparse embedding using BM42 if available, otherwise a tokenizer-based TF representation.
   * @param {string} text - Input text to embed.
   * @returns {Promise<{indices:number[], values:number[]}>} Sparse embedding.
   */
  async embed(text) {
    await this.init();
    if (this.bm42) {
      try {
        const result = await this.bm42.queryEmbed([text]);
        if (Array.isArray(result) && result[0]) {
          return result[0];
        }
      } catch (err) {
        this.logger.error({ err }, 'BM42 embedding failed, falling back');
      }
    }
    const tokens = text
      .toLowerCase()
      .split(/[^a-z0-9\.\+#]+/g)
      .map((t) => t.trim())
      .filter((t) => t.length > 1 && !this.stopwords.has(t) && this.vocab.has(t));
    const counts = new Map();
    tokens.forEach((token) => {
      const id = this.vocab.get(token);
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    const indices = [];
    const values = [];
    const total = tokens.length || 1;
    counts.forEach((count, id) => {
      indices.push(Number(id));
      values.push(count / total);
    });
    return { indices, values };
  }
}
