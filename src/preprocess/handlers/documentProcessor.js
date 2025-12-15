import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { candidateResumes } from '../../core/db/candidate_resumes/schema.js';
import { candidateSkills } from '../../core/db/candidate_skills/schema.js';
import { candidates } from '../../core/db/candidates/schema.js';
import { interviewTranscripts } from '../../core/db/interview_transcripts/schema.js';
import { oneWayTranscripts } from '../../core/db/one_way_transcripts/schema.js';
import { recruiterComments } from '../../core/db/recruiter_comments/schema.js';
import { skills } from '../../core/db/skills/schema.js';
import { BaseService } from '../../core/services/base/BaseService.js';
import { TYPES } from '../../core/types.js';
import { DOC_TYPES, INDEX_EVENT_TYPES } from '../../utils/constants.js';

/**
 * Handles document embedding + upsert into vector store.
 */
export class DocumentProcessor extends BaseService {
  /**
   * Processes an indexing_queue event by ID.
   * @param {number} indexingId - indexing_queue.id.
   * @returns {Promise<void>}
   */
  async process(indexingId) {
    const queueManager = this.dpi.get(TYPES.IndexingQueueManager);
    const event = await queueManager.getById(indexingId);
    if (!event) {
      this.logger.warn({ indexingId }, 'Indexing event missing');
      return;
    }

    await queueManager.markProcessing(event.id);

    try {
      const text = await this._fetchText(event);
      if (!text) {
        throw new Error(`No text found for doc_type=${event.doc_type} source=${event.source_id}`);
      }
      const metadata = await this._fetchCandidateMetadata(event.candidate_id);
      const chunks = await this._chunkText(text, 1500, Math.floor(1500 * 0.15));
      const points = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        const dense = await this.dpi
          .get(TYPES.EmbeddingService)
          .embed(chunkText, { type: 'document' });
        const sparse = await this.dpi.get(TYPES.SparseEmbeddingService).embed(chunkText);
        this.logger.info(
          {
            event_id: event.id,
            doc_type: event.doc_type,
            source_id: event.source_id,
            chunk_index: i,
            chunk_count: chunks.length,
            dense_length: dense?.length,
            sparse_indices: sparse?.indices?.length,
            sparse_values: sparse?.values?.length,
          },
          'Embedding generated'
        );
        const payload = {
          doc_type: event.doc_type,
          source_id: event.source_id,
          candidate_id: event.candidate_id,
          application_id: event.application_id,
          job_id: event.job_id,
          embedded_text: chunkText,
          chunk_index: i,
          chunk_count: chunks.length,
          skills: metadata.skills,
          notice_period_days: metadata.notice_period_days,
          current_location: metadata.current_location,
          total_experience_years: metadata.total_experience_years,
          expected_salary_lpa: metadata.expected_salary_lpa,
          can_join_immediately: metadata.can_join_immediately,
          preferred_work_type: metadata.preferred_work_type,
          current_title: metadata.current_title,
          current_company: metadata.current_company,
        };
        points.push({
          id: this._stablePointId(event.doc_type, event.source_id, i),
          dense,
          sparse,
          payload,
        });
      }

      await this.dpi.get(TYPES.VectorDBManager).upsert(points);
      await queueManager.markCompleted(event.id);
    } catch (err) {
      this.logger.error({ err, event }, 'Failed to process indexing event');
      await queueManager.markFailed(event.id, err.message);
      throw err;
    }
  }

  /**
   * Fetches raw text for a document type.
   * @param {object} event - Indexing event.
   * @returns {Promise<string|null>} Text content or null.
   */
  async _fetchText(event) {
    if (event.doc_type === DOC_TYPES.RESUME) {
      const rows = await this.db
        .select()
        .from(candidateResumes)
        .where(eq(candidateResumes.resume_id, event.source_id))
        .limit(1);
      return rows[0]?.resume_text || null;
    }
    if (event.doc_type === DOC_TYPES.INTERVIEW_TRANSCRIPT) {
      const rows = await this.db
        .select()
        .from(interviewTranscripts)
        .where(eq(interviewTranscripts.transcript_id, event.source_id))
        .limit(1);
      return rows[0]?.transcript_text || null;
    }
    if (event.doc_type === DOC_TYPES.ONE_WAY_TRANSCRIPT) {
      const rows = await this.db
        .select()
        .from(oneWayTranscripts)
        .where(eq(oneWayTranscripts.transcript_id, event.source_id))
        .limit(1);
      if (!rows[0]) {
        return null;
      }
      return `${rows[0].question_text}\n${rows[0].answer_text}`;
    }
    if (event.doc_type === DOC_TYPES.RECRUITER_COMMENT) {
      const rows = await this.db
        .select()
        .from(recruiterComments)
        .where(eq(recruiterComments.comment_id, event.source_id))
        .limit(1);
      return rows[0]?.comment_text || null;
    }
    if (event.event_type === INDEX_EVENT_TYPES.DELETE) {
      // For deletes we return empty text; deletion handled via upsert override.
      return '';
    }
    return null;
  }

  /**
   * Fetches candidate metadata and skills for payload filtering.
   * @param {number} candidateId - Candidate ID.
   * @returns {Promise<object>} Metadata payload.
   */
  async _fetchCandidateMetadata(candidateId) {
    const [candidate] = await this.db
      .select()
      .from(candidates)
      .where(eq(candidates.candidate_id, candidateId))
      .limit(1);
    const skillRows = await this.db
      .select({ skill_name: skills.skill_name })
      .from(candidateSkills)
      .leftJoin(skills, eq(candidateSkills.skill_id, skills.skill_id))
      .where(eq(candidateSkills.candidate_id, candidateId));
    return {
      skills: skillRows.map((row) => row.skill_name).filter(Boolean),
      notice_period_days: candidate?.notice_period_days ?? null,
      current_location: candidate?.current_location ?? null,
      total_experience_years:
        candidate?.total_experience_years != null ? Number(candidate.total_experience_years) : null,
      expected_salary_lpa:
        candidate?.expected_salary_lpa != null ? Number(candidate.expected_salary_lpa) : null,
      can_join_immediately: Boolean(candidate?.can_join_immediately),
      preferred_work_type: candidate?.preferred_work_type || null,
      current_title: candidate?.current_title || null,
      current_company: candidate?.current_company || null,
    };
  }

  /**
   * Generates a deterministic UUID for a vector point so upserts are idempotent.
   * @param {string} docType
   * @param {number|string} sourceId
   * @param {number} [chunkIndex]
   * @returns {string} UUID
   */
  _stablePointId(docType, sourceId, chunkIndex = 0) {
    const hex = crypto
      .createHash('sha256')
      .update(`${docType}:${sourceId}:${chunkIndex}`)
      .digest('hex');
    // format as UUID v4-like string from hash
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }

  /**
   * Splits text into overlapping chunks by tokens (whitespace-delimited).
   * @param {string} text
   * @param {number} maxTokens
   * @param {number} overlapTokens
   * @returns {string[]}
   */
  async _chunkText(text, maxTokens = 1500, overlapTokens = 200) {
    const tokenizer = await this._loadTokenizer();
    const ids = tokenizer.encode(text || '');
    if (!ids.length) return [];
    const chunks = [];
    const step = Math.max(1, maxTokens - overlapTokens);
    let start = 0;
    while (start < ids.length) {
      const end = Math.min(ids.length, start + maxTokens);
      const slice = ids.slice(start, end);
      const chunkText = tokenizer.decode(slice);
      chunks.push(chunkText);
      if (end === ids.length) break;
      start += step;
    }
    return chunks;
  }

  async _loadTokenizer() {
    if (this._tokenizer !== undefined) {
      return this._tokenizer;
    }
    try {
      // gpt-tokenizer provides encode/decode compatible with tiktoken
      const mod = await import('gpt-tokenizer');
      const encode = mod.encode || mod.default?.encode;
      const decode = mod.decode || mod.default?.decode;
      if (typeof encode === 'function' && typeof decode === 'function') {
        this._tokenizer = { encode, decode };
        return this._tokenizer;
      }
      throw new Error('Tokenizer module gpt-tokenizer loaded but encode/decode missing');
    } catch (err) {
      this.logger.error({ err }, 'Tokenizer gpt-tokenizer is required but not available');
      throw err;
    }
  }
}
