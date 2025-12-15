import { eq } from 'drizzle-orm';
import { jobApplications } from '../db/applications/schema.js';
import { CoreBaseManager } from './base/CoreBaseManager.js';

/**
 * Job application manager.
 */
export class ApplicationManager extends CoreBaseManager {
  /**
   * Creates a job application.
   * @param {object} payload - Application data.
   * @returns {Promise<object>} Created row.
   */
  async create(payload) {
    const [created] = await this.db.insert(jobApplications).values(payload).returning();
    return created;
  }

  /**
   * Retrieves an application by ID.
   * @param {number} id - Application ID.
   * @returns {Promise<object|null>} Application or null.
   */
  async getById(id) {
    const rows = await this.db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.application_id, id))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * Lists applications by candidate.
   * @param {number} candidateId - Candidate ID.
   * @returns {Promise<object[]>} Applications.
   */
  async listByCandidate(candidateId) {
    return this.db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.candidate_id, candidateId));
  }

  /**
   * Lists applications by job.
   * @param {number} jobId - Job ID.
   * @returns {Promise<object[]>} Applications.
   */
  async listByJob(jobId) {
    return this.db.select().from(jobApplications).where(eq(jobApplications.job_id, jobId));
  }

  /**
   * Lists all applications.
   * @returns {Promise<object[]>} Applications.
   */
  async list() {
    return this.db.select().from(jobApplications);
  }
}
