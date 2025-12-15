import { sql } from 'drizzle-orm';
import { jobApplications } from '../../core/db/applications/schema.js';
import { candidateResumes } from '../../core/db/candidate_resumes/schema.js';
import { candidateSkills } from '../../core/db/candidate_skills/schema.js';
import { candidates as candidatesTable } from '../../core/db/candidates/schema.js';
import { interviewScorecards } from '../../core/db/interview_scorecards/schema.js';
import { interviews } from '../../core/db/interviews/schema.js';
import { jobs } from '../../core/db/jobs/schema.js';
import { skills } from '../../core/db/skills/schema.js';
import { TYPES } from '../../core/types.js';
import { SEARCH_STRATEGIES } from '../../utils/constants.js';
import { BaseAIService } from '../services/base/BaseAIService.js';
import { fetchDocText } from './helpers.js';

/**
 * Three-tier search handler.
 * Level 0: Structured (SQL only)
 * Level 1: Hybrid (SQL filters + vector search)
 * Level 2: Semantic (vector search only)
 */
export class SearchHandler extends BaseAIService {
  /**
   * Main search entry point.
   * @param {string} query - Natural language query from recruiter.
   * @param {object} [options] - Search options.
   * @param {number} [options.jobId] - Optional job ID for context-based reranking.
   * @param {number} [options.topK] - Number of results to return.
   * @param {string} [options.thinking] - Thinking level: 'fast', 'balanced', or 'accurate'.
   * @returns {Promise<object>} Search response with results and metadata.
   */
  async search(query, options = {}) {
    const logger = this.logger;
    const topK = Math.min(
      options.topK ?? this.config.get('search.defaultTopK'),
      this.config.get('search.maxTopK')
    );
    const jobId = options.jobId || options.job_id || null;
    const thinking = options.thinking || this.config.get('thinking.default') || 'balanced';
    const llmOptions = { thinking };

    logger.info({ query, jobId, topK, thinking }, 'Search: starting');

    try {
      // Step 1: Extract intent and filters via LLM
      const extractor = this.dpi.get(TYPES.QueryExtractor);
      const extraction = await extractor.extract(query, llmOptions);

      const strategy = (extraction.search_strategy || SEARCH_STRATEGIES.HYBRID).toLowerCase();
      const filters = extraction.extracted_filters || {};
      const strategyExplanation = extraction.strategy_explanation || '';
      const semanticQuery = extraction.semantic_query || query;

      logger.info({ strategy, filters, strategyExplanation }, 'Search: extracted intent');

      // Step 2: Route to appropriate search method
      // LLM reranking for hybrid/semantic returns results with explanations included
      let results = [];
      let hasEmbeddedExplanations = false;

      if (strategy === SEARCH_STRATEGIES.STRUCTURED) {
        results = await this._structuredSearch(semanticQuery, filters, jobId, topK);
      } else if (strategy === SEARCH_STRATEGIES.SEMANTIC) {
        results = await this._semanticSearch(semanticQuery, topK, jobId, llmOptions);
        hasEmbeddedExplanations = true;
      } else {
        results = await this._hybridSearch(semanticQuery, filters, topK, jobId, llmOptions);
        hasEmbeddedExplanations = true;
      }

      logger.info(
        { resultCount: results.length, hasEmbeddedExplanations },
        'Search: got raw results'
      );

      // Step 3: Generate explanations (only for structured search)
      let explanationMap = new Map();
      if (!hasEmbeddedExplanations) {
        const explanationType = this.config.get('search.explanationType') || 'llm';
        explanationMap = await this._generateExplanations(
          explanationType,
          query,
          filters,
          strategyExplanation,
          results,
          llmOptions
        );
      }

      // Step 4: Format final response
      const finalResults = results.slice(0, topK).map((r) => ({
        candidate_id: r.candidate_id,
        match_score: r.match_score,
        matched_on: r.matched_on,
        explanation: r.explanation || explanationMap.get(Number(r.candidate_id)) || '',
      }));

      logger.info({ finalCount: finalResults.length }, 'Search: complete');

      return {
        query,
        search_strategy: strategy,
        extracted_filters: filters,
        strategy_explanation: strategyExplanation,
        results: finalResults,
      };
    } catch (err) {
      logger.error({ err, query }, 'Search: failed');
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LEVEL 0: STRUCTURED SEARCH
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Level 0: Pure SQL search with optional reranking.
   * @param {string} semanticQuery - Query text (may be empty).
   * @param {object} filters - Extracted filters.
   * @param {number|null} jobId - Optional job ID for reranking.
   * @param {number} topK - Result limit.
   * @returns {Promise<Array<{candidate_id: number, match_score: number, matched_on: string, content?: string}>>}
   */
  async _structuredSearch(semanticQuery, filters, jobId, topK) {
    const logger = this.logger;
    logger.info({ filters, jobId }, 'StructuredSearch: starting');

    try {
      const { clauses, needsSkillsJoin } = this._buildSqlClauses(filters, jobId);
      const fetchLimit = Math.max(topK * 5, 50);

      const whereSql = this._combineClauses(clauses);

      logger.debug(
        { clauseCount: clauses.length, needsSkillsJoin },
        'StructuredSearch: built SQL clauses'
      );

      const query = sql`
          SELECT
            c.candidate_id,
            c.can_join_immediately,
            c.notice_period_days,
            c.expected_salary_lpa,
            c.preferred_work_type,
            c.current_location,
            c.current_title,
            c.current_company,
            c.total_experience_years,
            MAX(iscore.overall_score) AS overall_score
          FROM ${candidatesTable} c
          LEFT JOIN ${jobApplications} a ON a.candidate_id = c.candidate_id
          ${needsSkillsJoin ? sql`LEFT JOIN ${candidateSkills} cs ON cs.candidate_id = c.candidate_id LEFT JOIN ${skills} s ON s.skill_id = cs.skill_id` : sql``}
          LEFT JOIN ${interviews} i ON i.application_id = a.application_id
          LEFT JOIN ${interviewScorecards} iscore ON iscore.interview_id = i.interview_id
          ${whereSql}
          GROUP BY
            c.candidate_id,
            c.can_join_immediately,
            c.notice_period_days,
            c.expected_salary_lpa,
            c.preferred_work_type,
            c.current_location,
            c.current_title,
            c.current_company,
            c.total_experience_years
          LIMIT ${fetchLimit}
        `;

      const rows = await this.db.execute(query);

      logger.info({ rowCount: rows.length }, 'StructuredSearch: SQL executed');

      if (!rows.length) {
        return [];
      }

      const candidates = rows.map((row) => ({
        candidate_id: Number(row.candidate_id),
        overall_score: row.overall_score != null ? Number(row.overall_score) : null,
        can_join_immediately: Boolean(row.can_join_immediately),
        notice_period_days: row.notice_period_days != null ? Number(row.notice_period_days) : null,
      }));

      // If job_id provided, rerank using job description vs resumes
      if (jobId) {
        return await this._rerankWithJobDescription(candidates, jobId, semanticQuery, topK);
      }

      // Otherwise, use deterministic scoring
      const scored = candidates.map((c) => ({
        candidate_id: c.candidate_id,
        match_score: this._calculateStructuredScore(c),
        matched_on: 'structured_score',
        content: '',
      }));

      return scored.sort((a, b) => b.match_score - a.match_score).slice(0, topK);
    } catch (err) {
      logger.error({ err }, 'StructuredSearch: failed');
      throw err;
    }
  }

  /**
   * Builds SQL WHERE clauses from filters.
   * @param {object} filters - Extracted filters.
   * @param {number|null} jobId - Optional job ID.
   * @returns {{clauses: Array, needsSkillsJoin: boolean}}
   */
  _buildSqlClauses(filters, jobId) {
    const logger = this.logger;
    logger.info({ filters, jobId }, 'StructuredSearch: building SQL clauses from filters');

    const clauses = [];
    let needsSkillsJoin = false;

    if (filters.locations?.length) {
      logger.info({ locations: filters.locations }, 'StructuredSearch: adding location filter');
      // Case-insensitive location matching
      clauses.push(
        sql`LOWER(c.current_location) IN (${sql.join(
          filters.locations.map((l) => sql`LOWER(${l})`),
          sql`, `
        )})`
      );
    }

    if (typeof filters.notice_period_max === 'number') {
      clauses.push(
        sql`(COALESCE(c.notice_period_days, 9999) <= ${filters.notice_period_max} OR c.can_join_immediately = true)`
      );
    }

    if (typeof filters.can_join_immediately === 'boolean' && filters.can_join_immediately) {
      clauses.push(sql`c.can_join_immediately = true`);
    }

    if (typeof filters.experience_min === 'number') {
      clauses.push(sql`c.total_experience_years >= ${filters.experience_min}`);
    }

    if (typeof filters.experience_max === 'number') {
      clauses.push(sql`c.total_experience_years <= ${filters.experience_max}`);
    }

    if (typeof filters.expected_salary_min === 'number') {
      clauses.push(sql`c.expected_salary_lpa >= ${filters.expected_salary_min}`);
    }

    if (typeof filters.expected_salary_max === 'number') {
      clauses.push(sql`c.expected_salary_lpa <= ${filters.expected_salary_max}`);
    }

    if (filters.preferred_work_type) {
      clauses.push(sql`c.preferred_work_type = ${filters.preferred_work_type}`);
    }

    if (filters.current_company) {
      clauses.push(sql`c.current_company ILIKE ${`%${filters.current_company}%`}`);
    }

    if (filters.skills?.length) {
      needsSkillsJoin = true;
      clauses.push(
        sql`s.skill_name IN (${sql.join(
          filters.skills.map((s) => sql`${s}`),
          sql`, `
        )})`
      );
    }

    if (jobId) {
      clauses.push(sql`a.job_id = ${jobId}`);
    }

    return { clauses, needsSkillsJoin };
  }

  /**
   * Combines SQL clauses into a WHERE statement.
   * @param {Array} clauses - SQL clause fragments.
   * @returns {object} Combined SQL.
   */
  _combineClauses(clauses) {
    if (!clauses.length) return sql``;

    let whereSql = sql`WHERE ${clauses[0]}`;
    for (let i = 1; i < clauses.length; i++) {
      whereSql = sql`${whereSql} AND ${clauses[i]}`;
    }
    return whereSql;
  }

  /**
   * Converts array to SQL IN clause values.
   * @param {(string|number)[]} values - Array values.
   * @returns {object} SQL joined values.
   */
  _toSqlInClause(values) {
    return sql.join(
      values.map((v) => sql`${v}`),
      sql`, `
    );
  }

  /**
   * Reranks candidates using job description vs their resumes.
   * @param {Array} candidates - Candidate data.
   * @param {number} jobId - Job ID.
   * @param {string} fallbackQuery - Fallback query if no job description.
   * @param {number} topK - Result limit.
   * @returns {Promise<Array>} Reranked results.
   */
  async _rerankWithJobDescription(candidates, jobId, fallbackQuery, topK) {
    const logger = this.logger;
    logger.info(
      { jobId, candidateCount: candidates.length },
      'StructuredSearch: reranking with job description'
    );

    try {
      const job = await this._getJob(jobId);
      const jobQuery = job?.description || job?.job_title || fallbackQuery;

      if (!jobQuery) {
        logger.warn({ jobId }, 'StructuredSearch: no job description found, using fallback');
      }

      const resumeMap = await this._getLatestResumes(candidates.map((c) => c.candidate_id));

      const docs = candidates
        .map((c) => ({
          id: String(c.candidate_id),
          candidate_id: c.candidate_id,
          content: resumeMap.get(c.candidate_id) || '',
          metadata: { candidate_id: c.candidate_id },
        }))
        .filter((d) => d.content);

      if (!docs.length) {
        logger.warn('StructuredSearch: no resumes found for reranking');
        return candidates.map((c) => ({
          candidate_id: c.candidate_id,
          match_score: this._calculateStructuredScore(c),
          matched_on: 'structured_score',
          content: '',
        }));
      }

      const reranker = this.dpi.get(TYPES.RerankerService);
      const reranked = await reranker.rerank(jobQuery, docs);

      const results = reranked.map((r) => ({
        candidate_id: Number(r.id),
        match_score: r.score,
        matched_on: 'resume_rerank',
        content: r.content,
      }));

      logger.info({ rerankedCount: results.length }, 'StructuredSearch: reranking complete');
      return this._aggregateByCandidate(results, topK);
    } catch (err) {
      logger.error({ err }, 'StructuredSearch: reranking failed');
      throw err;
    }
  }

  /**
   * Calculates deterministic score for structured search.
   * Interview score: 0-50, Immediate joiner: 0-30, Notice period: 0-20
   * @param {object} candidate - Candidate data.
   * @returns {number} Total score (0-100).
   */
  _calculateStructuredScore(candidate) {
    // Interview score: 0-50 points (assuming overall_score is 0-5 scale)
    const interviewScore =
      candidate.overall_score != null ? Math.min(50, Number(candidate.overall_score) * 10) : 0;

    // Availability score
    let availabilityScore = 0;
    if (candidate.can_join_immediately) {
      // Can join immediately: 30 points
      availabilityScore = 30;
    } else {
      // Notice period: 0-20 points (lower notice = higher score)
      const noticeDays = candidate.notice_period_days ?? 90;
      availabilityScore = Math.max(0, 20 - Math.min(noticeDays, 20));
    }

    return interviewScore + availabilityScore;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LEVEL 1: HYBRID SEARCH
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Level 1: Hybrid search with Qdrant filters + vector search.
   * @param {string} semanticQuery - Query for embedding.
   * @param {object} filters - Extracted filters for Qdrant payload filter.
   * @param {number} topK - Result limit.
   * @param {number|null} jobId - Optional job ID to filter by applicants.
   * @param {object} [options] - LLM options including thinking level.
   * @returns {Promise<Array>} Search results.
   */
  async _hybridSearch(semanticQuery, filters, topK, jobId = null, options = {}) {
    const logger = this.logger;
    logger.info({ semanticQuery, filters, jobId }, 'HybridSearch: starting');

    try {
      const vectorManager = this.dpi.get(TYPES.VectorDBManager);
      const embeddingService = this.dpi.get(TYPES.EmbeddingService);
      const sparseService = this.dpi.get(TYPES.SparseEmbeddingService);

      // Generate embeddings
      const [dense, sparse] = await Promise.all([
        embeddingService.embed(semanticQuery, { type: 'query' }),
        sparseService.embed(semanticQuery),
      ]);

      // Build Qdrant filter with optional job applicant filter
      const qdrantFilter = await this._buildQdrantFilterWithJob(filters, jobId);
      const fetchLimit = Math.max(topK * this.config.get('search.rerankFetchMultiplier'), 80);

      logger.warn({ qdrantFilter, fetchLimit }, 'HybridSearch: executing vector search');

      const hits = await vectorManager.hybridSearch({
        dense,
        sparse,
        filter: qdrantFilter,
        limit: fetchLimit,
      });

      logger.info({ hitCount: hits.length }, 'HybridSearch: vector search complete');

      // Prepare docs with full payload for LLM reranking
      const docs = hits.map((hit) => ({
        id: String(hit.id),
        content: hit.payload?.embedded_text || '',
        metadata: hit.payload,
      }));

      // Use LLM reranker which returns candidates with explanations
      const llmReranker = this.dpi.get(TYPES.LLMReranker);
      const reranked = await llmReranker.rerank(semanticQuery, docs, topK, options);

      logger.info({ rerankedCount: reranked.length }, 'HybridSearch: LLM reranking complete');

      return reranked.map((r) => ({
        candidate_id: r.candidate_id,
        match_score: r.match_score,
        matched_on: 'hybrid',
        explanation: r.explanation,
        content: '',
      }));
    } catch (err) {
      logger.error({ err }, 'HybridSearch: failed');
      throw err;
    }
  }

  /**
   * Builds Qdrant payload filter from extracted filters.
   * @param {object} filters - Extracted filters.
   * @returns {object|null} Qdrant filter object.
   */
  _buildQdrantFilter(filters = {}) {
    const must = [];

    if (filters.skills?.length) {
      must.push({ key: 'skills', match: { any: filters.skills } });
    }

    if (filters.locations?.length) {
      must.push({ key: 'current_location', match: { any: filters.locations } });
    }

    if (typeof filters.notice_period_max === 'number') {
      must.push({ key: 'notice_period_days', range: { lte: filters.notice_period_max } });
    }

    if (typeof filters.can_join_immediately === 'boolean') {
      must.push({ key: 'can_join_immediately', match: { value: filters.can_join_immediately } });
    }

    if (typeof filters.experience_min === 'number') {
      must.push({ key: 'total_experience_years', range: { gte: filters.experience_min } });
    }

    if (typeof filters.experience_max === 'number') {
      must.push({ key: 'total_experience_years', range: { lte: filters.experience_max } });
    }

    if (typeof filters.expected_salary_min === 'number') {
      must.push({ key: 'expected_salary_lpa', range: { gte: filters.expected_salary_min } });
    }

    if (typeof filters.expected_salary_max === 'number') {
      must.push({ key: 'expected_salary_lpa', range: { lte: filters.expected_salary_max } });
    }

    if (filters.preferred_work_type) {
      must.push({ key: 'preferred_work_type', match: { value: filters.preferred_work_type } });
    }

    if (filters.current_company) {
      must.push({ key: 'current_company', match: { value: filters.current_company } });
    }

    return must.length ? { must } : null;
  }

  /**
   * Builds Qdrant filter with optional job applicant restriction.
   * @param {object} filters - Extracted filters.
   * @param {number|null} jobId - Optional job ID to filter by applicants.
   * @returns {Promise<object|null>} Qdrant filter object.
   */
  async _buildQdrantFilterWithJob(filters = {}, jobId = null) {
    const baseFilter = this._buildQdrantFilter(filters);

    if (!jobId) {
      return baseFilter;
    }

    // Get candidate IDs who applied to this job
    const candidateIds = await this._getCandidateIdsForJob(jobId);

    if (!candidateIds.length) {
      this.logger.warn({ jobId }, 'No candidates found for job, returning empty filter');
      // Return a filter that matches nothing (candidate_id = -1 which won't exist)
      return { must: [{ key: 'candidate_id', match: { value: -1 } }] };
    }

    this.logger.info({ jobId, candidateCount: candidateIds.length }, 'Filtering by job applicants');

    const candidateFilter = { key: 'candidate_id', match: { any: candidateIds } };

    if (baseFilter?.must?.length) {
      return { must: [...baseFilter.must, candidateFilter] };
    }

    return { must: [candidateFilter] };
  }

  /**
   * Fetches candidate IDs who applied to a specific job.
   * @param {number} jobId - Job ID.
   * @returns {Promise<number[]>} Array of candidate IDs.
   */
  async _getCandidateIdsForJob(jobId) {
    const rows = await this.db.execute(
      sql`SELECT DISTINCT candidate_id FROM ${jobApplications} WHERE job_id = ${jobId}`
    );
    return rows.map((r) => Number(r.candidate_id));
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LEVEL 2: SEMANTIC SEARCH
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Level 2: Pure semantic/vector search without filters.
   * @param {string} semanticQuery - Query for embedding.
   * @param {number} topK - Result limit.
   * @param {number|null} jobId - Optional job ID to filter by applicants.
   * @param {object} [options] - LLM options including thinking level.
   * @returns {Promise<Array>} Search results.
   */
  async _semanticSearch(semanticQuery, topK, jobId = null, options = {}) {
    const logger = this.logger;
    logger.info({ semanticQuery, jobId }, 'SemanticSearch: starting');

    try {
      const vectorManager = this.dpi.get(TYPES.VectorDBManager);
      const embeddingService = this.dpi.get(TYPES.EmbeddingService);
      const sparseService = this.dpi.get(TYPES.SparseEmbeddingService);

      // Generate embeddings
      const [dense, sparse] = await Promise.all([
        embeddingService.embed(semanticQuery, { type: 'query' }),
        sparseService.embed(semanticQuery),
      ]);

      const fetchLimit = Math.max(
        topK * (this.config.get('search.rerankFetchMultiplier') || 3),
        80
      );

      // Build filter from job applicants if jobId provided
      const qdrantFilter = await this._buildQdrantFilterWithJob({}, jobId);

      logger.debug({ fetchLimit, hasJobFilter: !!jobId }, 'SemanticSearch: executing vector search');

      const hits = await vectorManager.hybridSearch({
        dense,
        sparse,
        filter: qdrantFilter,
        limit: fetchLimit,
      });

      logger.info({ hitCount: hits.length }, 'SemanticSearch: vector search complete');

      // Prepare docs with full payload for LLM reranking
      const docs = hits.map((hit) => ({
        id: String(hit.id),
        content: hit.payload?.embedded_text || '',
        metadata: hit.payload,
      }));

      // Use LLM reranker which returns candidates with explanations
      const llmReranker = this.dpi.get(TYPES.LLMReranker);
      const reranked = await llmReranker.rerank(semanticQuery, docs, topK, options);

      logger.info({ rerankedCount: reranked.length }, 'SemanticSearch: LLM reranking complete');

      return reranked.map((r) => ({
        candidate_id: r.candidate_id,
        match_score: r.match_score,
        matched_on: 'semantic',
        explanation: r.explanation,
        content: '',
      }));
    } catch (err) {
      logger.error({ err }, 'SemanticSearch: failed');
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SHARED UTILITIES
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Fetches document content for vector search hits.
   * @param {Array} hits - Qdrant search hits.
   * @returns {Promise<Array>} Documents with content.
   */
  async _fetchDocContents(hits) {
    const docs = [];
    for (const hit of hits) {
      const content = await fetchDocText(this.db, hit.payload?.doc_type, hit.payload?.source_id);
      if (!content) continue;
      docs.push({
        id: String(hit.payload?.source_id || hit.id),
        candidate_id: Number(hit.payload?.candidate_id),
        content,
        metadata: { doc_type: hit.payload?.doc_type, candidate_id: hit.payload?.candidate_id },
      });
    }
    return docs;
  }

  /**
   * Reranks documents using the reranker service.
   * @param {string} query - Query for reranking.
   * @param {Array} docs - Documents to rerank.
   * @returns {Promise<Array>} Reranked documents.
   */
  async _rerankDocs(query, docs) {
    if (!docs.length) return [];
    const reranker = this.dpi.get(TYPES.RerankerService);
    return reranker.rerank(query, docs);
  }

  /**
   * Aggregates results by candidate, keeping highest score per candidate.
   * @param {Array} docs - Documents with scores.
   * @param {number} topK - Result limit.
   * @returns {Array} Aggregated results.
   */
  _aggregateByCandidate(docs, topK) {
    const map = new Map();
    docs.forEach((d) => {
      if (!d.candidate_id) return;
      const existing = map.get(d.candidate_id);
      if (!existing || d.match_score > existing.match_score) {
        map.set(d.candidate_id, d);
      }
    });
    return Array.from(map.values())
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, topK);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // EXPLANATION GENERATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Generates explanations based on config type.
   * @param {string} type - 'llm' or 'deterministic'.
   * @param {string} query - Original query.
   * @param {object} filters - Extracted filters.
   * @param {string} strategyExplanation - Strategy explanation from LLM.
   * @param {Array} results - Search results.
   * @param {object} [options] - LLM options including thinking level.
   * @returns {Promise<Map<number, string>>} Map of candidate_id to explanation.
   */
  async _generateExplanations(type, query, filters, strategyExplanation, results, options = {}) {
    const map = new Map();
    if (!results.length) return map;

    if (type === 'deterministic') {
      const explanation = this._buildDeterministicExplanation(filters, strategyExplanation);
      results.forEach((r) => map.set(Number(r.candidate_id), explanation));
      return map;
    }

    // LLM-based explanation
    try {
      const generator = this.dpi.get(TYPES.ExplanationGenerator);
      const payload = results.map((r) => ({
        candidate_id: r.candidate_id,
        content: r.content || '',
        score: r.match_score,
        matched_on: r.matched_on,
      }));
      const explanations = await generator.generate(query, payload, options);
      explanations.forEach((e) => map.set(Number(e.candidate_id), e.explanation));
    } catch (err) {
      this.logger.warn({ err }, 'Explanation generation failed, using deterministic fallback');
      const fallback = this._buildDeterministicExplanation(filters, strategyExplanation);
      results.forEach((r) => map.set(Number(r.candidate_id), fallback));
    }

    return map;
  }

  /**
   * Builds a deterministic explanation from filters.
   * @param {object} filters - Extracted filters.
   * @param {string} strategyExplanation - Strategy explanation.
   * @returns {string} Human-readable explanation.
   */
  _buildDeterministicExplanation(filters, strategyExplanation) {
    const parts = [];

    if (filters.locations?.length) {
      parts.push(`location in [${filters.locations.join(', ')}]`);
    }
    if (typeof filters.notice_period_max === 'number') {
      parts.push(`notice period <= ${filters.notice_period_max} days`);
    }
    if (filters.can_join_immediately) {
      parts.push('can join immediately');
    }
    if (typeof filters.experience_min === 'number') {
      parts.push(`experience >= ${filters.experience_min} years`);
    }
    if (typeof filters.experience_max === 'number') {
      parts.push(`experience <= ${filters.experience_max} years`);
    }
    if (typeof filters.expected_salary_min === 'number') {
      parts.push(`salary >= ${filters.expected_salary_min} LPA`);
    }
    if (typeof filters.expected_salary_max === 'number') {
      parts.push(`salary <= ${filters.expected_salary_max} LPA`);
    }
    if (filters.preferred_work_type) {
      parts.push(`work type = ${filters.preferred_work_type}`);
    }
    if (filters.current_company) {
      parts.push(`company contains "${filters.current_company}"`);
    }
    if (filters.skills?.length) {
      parts.push(`skills: ${filters.skills.join(', ')}`);
    }

    const filterStr = parts.length
      ? `Matched: ${parts.join('; ')}.`
      : 'Matched based on search criteria.';
    return strategyExplanation ? `${filterStr} ${strategyExplanation}` : filterStr;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // DATABASE HELPERS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Fetches job by ID.
   * @param {number} jobId - Job ID.
   * @returns {Promise<object|null>} Job record.
   */
  async _getJob(jobId) {
    const rows = await this.db.select().from(jobs).where(sql`${jobs.job_id} = ${jobId}`).limit(1);
    return rows[0] || null;
  }

  /**
   * Fetches latest resume for each candidate.
   * @param {number[]} candidateIds - Candidate IDs.
   * @returns {Promise<Map<number, string>>} Map of candidate_id to resume_text.
   */
  async _getLatestResumes(candidateIds = []) {
    const map = new Map();
    if (!candidateIds.length) return map;

    const rows = await this.db.execute(
      sql`
        SELECT DISTINCT ON (candidate_id) candidate_id, resume_text
        FROM ${candidateResumes}
        WHERE candidate_id IN (${this._toSqlInClause(candidateIds)})
        ORDER BY candidate_id, resume_id DESC
      `
    );

    rows.forEach((r) => map.set(Number(r.candidate_id), r.resume_text));
    return map;
  }
}
