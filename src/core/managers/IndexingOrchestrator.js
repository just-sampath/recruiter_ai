import { DOC_TYPES, INDEX_EVENT_TYPES } from '../../utils/constants.js';
import { TYPES } from '../types.js';
import { CoreBaseManager } from './base/CoreBaseManager.js';

/**
 * Central owner of indexing side effects (enqueue UPSERT/DELETE, recreate collection).
 * Only module that should call ProcessDocumentsQueue.enqueue.
 */
export class IndexingOrchestrator extends CoreBaseManager {
  /**
   * Opaque scope for deduplicating enqueues within one import transaction.
   * @returns {Set<string>}
   */
  createDedupeScope() {
    return new Set();
  }

  /**
   * @param {string} docType
   * @param {number} sourceId
   * @param {Set<string>|undefined} scope
   * @returns {{ skipped: true, enqueued: false, reason: string }|null}
   */
  _checkDedupe(docType, sourceId, scope) {
    if (!scope) {
      return null;
    }
    const key = `${docType}:${sourceId}`;
    if (scope.has(key)) {
      return { enqueued: false, skipped: true, reason: 'dedupe_scope' };
    }
    return null;
  }

  /**
   * @param {string} docType
   * @param {number} sourceId
   * @param {Set<string>|undefined} scope
   */
  _markDedupe(docType, sourceId, scope) {
    if (scope) {
      scope.add(`${docType}:${sourceId}`);
    }
  }

  /**
   * @param {object} payload - IndexingQueue payload fields.
   * @returns {Promise<object>} Created indexing_queue row.
   */
  async _enqueue(payload) {
    try {
      return await this.dpi.get(TYPES.ProcessDocumentsQueue).enqueue(payload);
    } catch (err) {
      this.logger.error({ err, payload }, 'IndexingOrchestrator enqueue failed');
      throw err;
    }
  }

  /**
   * Enqueue UPSERT for a resume document.
   * @param {object} params
   * @param {number} params.resumeId
   * @param {number} params.candidateId
   * @param {number} [params.applicationId]
   * @param {number} [params.jobId]
   * @param {Set<string>} [params.scope]
   * @returns {Promise<{ enqueued: boolean, skipped?: boolean, reason?: string, event? }>}
   */
  async enqueueResume({ resumeId, candidateId, applicationId = null, jobId = null, scope }) {
    const docType = DOC_TYPES.RESUME;
    const skipped = this._checkDedupe(docType, resumeId, scope);
    if (skipped) {
      return skipped;
    }
    const event = await this._enqueue({
      event_type: INDEX_EVENT_TYPES.UPSERT,
      doc_type: docType,
      source_id: resumeId,
      candidate_id: candidateId,
      application_id: applicationId ?? null,
      job_id: jobId ?? null,
    });
    this._markDedupe(docType, resumeId, scope);
    return { enqueued: true, event };
  }

  /**
   * Enqueue UPSERT for an interview transcript.
   * @param {object} params
   * @param {number} params.transcriptId
   * @param {number} params.candidateId
   * @param {number} params.applicationId
   * @param {number} [params.jobId]
   * @param {Set<string>} [params.scope]
   * @returns {Promise<{ enqueued: boolean, skipped?: boolean, reason?: string, event? }>}
   */
  async enqueueInterviewTranscript({
    transcriptId,
    candidateId,
    applicationId,
    jobId = null,
    scope,
  }) {
    const docType = DOC_TYPES.INTERVIEW_TRANSCRIPT;
    const skipped = this._checkDedupe(docType, transcriptId, scope);
    if (skipped) {
      return skipped;
    }
    const event = await this._enqueue({
      event_type: INDEX_EVENT_TYPES.UPSERT,
      doc_type: docType,
      source_id: transcriptId,
      candidate_id: candidateId,
      application_id: applicationId ?? null,
      job_id: jobId ?? null,
    });
    this._markDedupe(docType, transcriptId, scope);
    return { enqueued: true, event };
  }

  /**
   * Enqueue UPSERT for a one-way interview transcript.
   * @param {object} params
   * @param {number} params.transcriptId
   * @param {number} params.candidateId
   * @param {number} params.applicationId
   * @param {number} [params.jobId]
   * @param {Set<string>} [params.scope]
   * @returns {Promise<{ enqueued: boolean, skipped?: boolean, reason?: string, event? }>}
   */
  async enqueueOneWayTranscript({
    transcriptId,
    candidateId,
    applicationId,
    jobId = null,
    scope,
  }) {
    const docType = DOC_TYPES.ONE_WAY_TRANSCRIPT;
    const skipped = this._checkDedupe(docType, transcriptId, scope);
    if (skipped) {
      return skipped;
    }
    const event = await this._enqueue({
      event_type: INDEX_EVENT_TYPES.UPSERT,
      doc_type: docType,
      source_id: transcriptId,
      candidate_id: candidateId,
      application_id: applicationId ?? null,
      job_id: jobId ?? null,
    });
    this._markDedupe(docType, transcriptId, scope);
    return { enqueued: true, event };
  }

  /**
   * Enqueue UPSERT for a recruiter comment.
   * @param {object} params
   * @param {number} params.commentId
   * @param {number} params.candidateId
   * @param {number} params.applicationId
   * @param {number} [params.jobId]
   * @param {Set<string>} [params.scope]
   * @returns {Promise<{ enqueued: boolean, skipped?: boolean, reason?: string, event? }>}
   */
  async enqueueRecruiterComment({
    commentId,
    candidateId,
    applicationId,
    jobId = null,
    scope,
  }) {
    const docType = DOC_TYPES.RECRUITER_COMMENT;
    const skipped = this._checkDedupe(docType, commentId, scope);
    if (skipped) {
      return skipped;
    }
    const event = await this._enqueue({
      event_type: INDEX_EVENT_TYPES.UPSERT,
      doc_type: docType,
      source_id: commentId,
      candidate_id: candidateId,
      application_id: applicationId ?? null,
      job_id: jobId ?? null,
    });
    this._markDedupe(docType, commentId, scope);
    return { enqueued: true, event };
  }

  /**
   * Enqueue UPSERT for a screening answer.
   * @param {object} params
   * @param {number} params.answerId
   * @param {number} params.candidateId
   * @param {number} [params.applicationId]
   * @param {number} [params.jobId]
   * @param {Set<string>} [params.scope]
   * @returns {Promise<{ enqueued: boolean, skipped?: boolean, reason?: string, event? }>}
   */
  async enqueueScreeningAnswer({
    answerId,
    candidateId,
    applicationId = null,
    jobId = null,
    scope,
  }) {
    const docType = DOC_TYPES.SCREENING_ANSWER;
    const skipped = this._checkDedupe(docType, answerId, scope);
    if (skipped) {
      return skipped;
    }
    const event = await this._enqueue({
      event_type: INDEX_EVENT_TYPES.UPSERT,
      doc_type: docType,
      source_id: answerId,
      candidate_id: candidateId,
      application_id: applicationId ?? null,
      job_id: jobId ?? null,
    });
    this._markDedupe(docType, answerId, scope);
    return { enqueued: true, event };
  }

  /**
   * Enqueue a DELETE event for a document (always enqueues; no immediate vector delete).
   * @param {object} params
   * @param {string} params.docType
   * @param {number} params.sourceId
   * @param {number} params.candidateId
   * @returns {Promise<{ enqueued: boolean, event? }>}
   */
  async deleteDocument({ docType, sourceId, candidateId }) {
    const event = await this._enqueue({
      event_type: INDEX_EVENT_TYPES.DELETE,
      doc_type: docType,
      source_id: sourceId,
      candidate_id: candidateId,
      application_id: null,
      job_id: null,
    });
    return { enqueued: true, event };
  }

  /**
   * Delete and recreate the Qdrant collection (Cloud-safe via VectorDBManager).
   * @returns {Promise<void>}
   */
  async recreateCollection() {
    try {
      await this.dpi.get(TYPES.VectorDBManager).recreateCollection();
    } catch (err) {
      this.logger.error({ err }, 'IndexingOrchestrator recreateCollection failed');
      throw err;
    }
  }

  /**
   * Load latest resume for candidate and enqueue UPSERT if present.
   * @param {number} candidateId
   * @param {object} [opts]
   * @param {number} [opts.applicationId]
   * @param {number} [opts.jobId]
   * @param {Set<string>} [opts.scope]
   * @returns {Promise<{ enqueued: boolean, skipped?: boolean, reason?: string, event? }>}
   */
  async enqueueLatestResumeForCandidate(
    candidateId,
    { applicationId = null, jobId = null, scope } = {}
  ) {
    const resume = await this.dpi.get(TYPES.CandidateManager).getLatestResume(candidateId);
    if (!resume) {
      return { enqueued: false, skipped: true, reason: 'no_resume' };
    }
    return this.enqueueResume({
      resumeId: resume.resume_id,
      candidateId,
      applicationId,
      jobId,
      scope,
    });
  }
}
