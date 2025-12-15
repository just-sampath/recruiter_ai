import { QdrantClient } from '@qdrant/js-client-rest';
import { VectorDB } from './VectorDB.js';

/**
 * Qdrant vector database service with hybrid RRF fusion.
 */
export class QdrantService extends VectorDB {
  constructor() {
    super();
    const cfg = this.config.get('qdrant');
    this.collectionName = cfg.collection;
    this.sparseName = cfg.sparse?.name || 'text-sparse';
    this.denseSize = cfg.dense?.size || 1536;
    this.distance = cfg.dense?.distance || 'Cosine';
    this.denseName = cfg.dense?.name || 'text-dense';
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || cfg.url,
      apiKey: process.env.QDRANT_API_KEY || cfg.apiKey || undefined,
    });
    this._collectionEnsured = false;
  }

  /**
   * Ensures the Qdrant collection is available.
   * @returns {Promise<void>}
   */
  async ensureCollection() {
    if (this._collectionEnsured) {
      return;
    }
    // Ping
    await this.client.getCollections();

    // Check existing collection
    let collectionInfo = null;
    try {
      collectionInfo = await this.client.getCollection(this.collectionName);
    } catch (err) {
      collectionInfo = null;
    }

    if (!collectionInfo) {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          [this.denseName]: {
            size: this.denseSize,
            distance: this.distance,
          },
        },
        sparse_vectors: {
          [this.sparseName]: {
            modifier: 'idf',
          },
        },
      });
      await this._ensurePayloadIndexes();
      this.logger.info(
        { collection: this.collectionName },
        'Created Qdrant collection with dense+sparse'
      );
      this._collectionEnsured = true;
      return;
    }

    await this._ensurePayloadIndexes();
    this._collectionEnsured = true;
  }

  /**
   * Upserts points with dense and sparse vectors.
   * @param {Array<{id: string|number, dense?: number[], sparse?: {indices:number[], values:number[]}, payload?: object}>} points
   * @returns {Promise<void>}
   */
  async upsert(points = []) {
    await this.ensureCollection();
    const mapped = points.map((point) => {
      const hasDense = Array.isArray(point.dense) && point.dense.length;
      const hasSparse =
        point.sparse && Array.isArray(point.sparse.indices) && Array.isArray(point.sparse.values);
      if (!hasDense || !hasSparse) {
        throw new Error('Qdrant upsert requires both dense and sparse embeddings');
      }
      const payload = {
        id: point.id,
        payload: point.payload ?? {},
        vector: {
          [this.denseName]: point.dense,
          [this.sparseName]: point.sparse,
        },
      };
      this.logger.debug(
        {
          id: point.id,
          hasDense,
          hasSparse,
          denseLength: point.dense?.length,
          sparseIndices: point.sparse?.indices?.length,
          sparseValues: point.sparse?.values?.length,
        },
        'Qdrant upsert point'
      );
      return payload;
    });
    await this.client.upsert(this.collectionName, { wait: true, points: mapped });
  }

  /**
   * Executes a hybrid search in a single Qdrant query call using server-side RRF fusion.
   * @param {object} params - Search params.
   * @param {number[]} params.dense - Dense vector.
   * @param {{indices:number[], values:number[]}} params.sparse - Sparse vector.
   * @param {object} [params.filter] - Optional Qdrant filter.
   * @param {number} [params.limit=10] - Number of results to return.
   * @returns {Promise<Array<object>>} Search results with fused score.
   */
  async hybridSearch({ dense, sparse, filter, limit = 10 }) {
    await this.ensureCollection();

    const hasDense = Array.isArray(dense) && dense.length > 0;
    const hasSparse = sparse && Array.isArray(sparse.indices) && sparse.indices.length > 0;

    this.logger.info(
      {
        collection: this.collectionName,
        limit,
        hasFilter: !!filter,
        hasDense,
        hasSparse,
        denseLength: dense?.length,
        sparseIndicesCount: sparse?.indices?.length,
      },
      'Qdrant: starting hybrid search'
    );

    if (!hasDense) {
      this.logger.warn('Qdrant: no dense vector provided, search may return poor results');
    }

    const prefetch = [];

    // Always add dense prefetch
    if (hasDense) {
      prefetch.push({
        query: dense,
        using: this.denseName,
        limit,
      });
    }

    // Add sparse prefetch if available
    if (hasSparse) {
      prefetch.push({
        query: sparse,
        using: this.sparseName,
        limit,
      });
    }

    const queryParams = {
      prefetch,
      query: { fusion: 'rrf' },
      with_payload: true,
      with_vector: false,
      limit,
    };

    // Apply filter if provided
    if (filter) {
      queryParams.filter = filter;
      this.logger.debug({ filter }, 'Qdrant: applying filter to search');
    }

    const startTime = Date.now();

    try {
      const response = await this.client.query(this.collectionName, queryParams);
      const latencyMs = Date.now() - startTime;

      const hits = (response?.points || []).map((hit) => ({
        id: hit.id,
        score: hit.score,
        payload: hit.payload || {},
      }));

      this.logger.info(
        {
          hitCount: hits.length,
          latencyMs,
          topScore: hits[0]?.score,
          prefetchCount: prefetch.length,
        },
        'Qdrant: hybrid search complete'
      );

      return hits;
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      this.logger.error({ err, latencyMs }, 'Qdrant: hybrid search failed');
      throw err;
    }
  }

  /**
   * Ensures payload indexes for common filters.
   * @returns {Promise<void>}
   */
  async _ensurePayloadIndexes() {
    const fields = [
      { field_name: 'candidate_id', field_schema: 'integer' },
      { field_name: 'skills', field_schema: 'keyword' },
      { field_name: 'current_location', field_schema: 'keyword' },
      { field_name: 'notice_period_days', field_schema: 'integer' },
      { field_name: 'total_experience_years', field_schema: 'float' },
      { field_name: 'expected_salary_lpa', field_schema: 'float' },
      { field_name: 'job_id', field_schema: 'integer' },
      { field_name: 'can_join_immediately', field_schema: 'bool' },
      { field_name: 'preferred_work_type', field_schema: 'keyword' },
      { field_name: 'current_title', field_schema: 'keyword' },
      { field_name: 'current_company', field_schema: 'keyword' },
    ];
    for (const field of fields) {
      try {
        await this.client.createPayloadIndex(this.collectionName, field);
      } catch (err) {
        // ignore if already exists
        if (!String(err?.message || '').includes('already exists')) {
          this.logger.warn({ err, field }, 'Failed to create payload index');
        }
      }
    }
  }
}
