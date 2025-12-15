import { desc, eq } from 'drizzle-orm';
import { hashPassword } from '../../utils/auth.js';
import { DOC_TYPES, INDEX_EVENT_TYPES } from '../../utils/constants.js';
import { candidateResumes } from '../db/candidate_resumes/schema.js';
import { candidates } from '../db/candidates/schema.js';
import { TYPES } from '../types.js';
import { CoreBaseManager } from './base/CoreBaseManager.js';

/**
 * Candidate persistence and related operations.
 */
export class CandidateManager extends CoreBaseManager {
  /**
   * Fetch candidate by ID.
   * @param {number} id - Candidate ID.
   * @returns {Promise<object|null>} Candidate row or null.
   */
  async getById(id) {
    const rows = await this.db
      .select()
      .from(candidates)
      .where(eq(candidates.candidate_id, id))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * Retrieves candidate by email.
   * @param {string} email - Candidate email.
   * @returns {Promise<object|null>} Candidate or null.
   */
  async getByEmail(email) {
    const rows = await this.db
      .select()
      .from(candidates)
      .where(eq(candidates.email, email))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * Creates a candidate and optionally a resume, then enqueues indexing.
   * @param {object} data - Candidate payload including password and optional resume_text.
   * @returns {Promise<object>} Created candidate.
   */
  async create(data) {
    const password_hash = await hashPassword(data.password);
    const candidatePayload = { ...data, password_hash };
    // biome-ignore lint/performance/noDelete: delete is required here - Drizzle ORM treats undefined differently than missing properties
    delete candidatePayload.password;
    // biome-ignore lint/performance/noDelete: delete is required here - Drizzle ORM treats undefined differently than missing properties
    delete candidatePayload.resume_text;

    const [created] = await this.db.insert(candidates).values(candidatePayload).returning();

    if (data.resume_text) {
      const [resume] = await this.db
        .insert(candidateResumes)
        .values({ candidate_id: created.candidate_id, resume_text: data.resume_text })
        .returning();

      await this.dpi.get(TYPES.ProcessDocumentsQueue).enqueue({
        event_type: INDEX_EVENT_TYPES.UPSERT,
        doc_type: DOC_TYPES.RESUME,
        source_id: resume.resume_id,
        candidate_id: created.candidate_id,
        application_id: null,
        job_id: null,
      });
    }

    return created;
  }

  /**
   * Updates a candidate profile.
   * @param {number} id - Candidate ID.
   * @param {object} updates - Fields to update.
   * @returns {Promise<object|null>} Updated row or null.
   */
  async update(id, updates) {
    const payload = { ...updates };
    if (payload.password) {
      payload.password_hash = await hashPassword(payload.password);
      // biome-ignore lint/performance/noDelete: delete is required here - Drizzle ORM treats undefined differently than missing properties
      delete payload.password;
    }
    const resumeText = payload.resume_text;
    // biome-ignore lint/performance/noDelete: delete is required here - Drizzle ORM treats undefined differently than missing properties
    delete payload.resume_text;
    const [updated] = await this.db
      .update(candidates)
      .set(payload)
      .where(eq(candidates.candidate_id, id))
      .returning();
    if (!updated) {
      return null;
    }
    if (resumeText) {
      const [resume] = await this.db
        .insert(candidateResumes)
        .values({ candidate_id: updated.candidate_id, resume_text: resumeText })
        .returning();
      await this.dpi.get(TYPES.ProcessDocumentsQueue).enqueue({
        event_type: INDEX_EVENT_TYPES.UPSERT,
        doc_type: DOC_TYPES.RESUME,
        source_id: resume.resume_id,
        candidate_id: updated.candidate_id,
        application_id: null,
        job_id: null,
      });
    }
    return updated;
  }

  /**
   * Validates candidate login credentials.
   * @param {string} email - Candidate email.
   * @param {string} password - Plain password.
   * @returns {Promise<object|null>} Candidate if valid.
   */
  async validateLogin(email, password) {
    const candidate = await this.getByEmail(email);
    if (!candidate) {
      return null;
    }
    const { verifyPassword } = await import('../../utils/auth.js');
    const ok = await verifyPassword(password, candidate.password_hash);
    return ok ? candidate : null;
  }

  /**
   * Fetches the latest resume for a candidate.
   * @param {number} candidateId - Candidate ID.
   * @returns {Promise<object|null>} Resume row or null.
   */
  async getLatestResume(candidateId) {
    const rows = await this.db
      .select()
      .from(candidateResumes)
      .where(eq(candidateResumes.candidate_id, candidateId))
      .orderBy(desc(candidateResumes.created_at))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * Lists all candidates.
   * @returns {Promise<object[]>} Candidate rows.
   */
  async list() {
    return this.db.select().from(candidates);
  }
}
