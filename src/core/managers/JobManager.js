import { eq } from 'drizzle-orm';
import { jobs } from '../db/jobs/schema.js';
import { CoreBaseManager } from './base/CoreBaseManager.js';

/**
 * Job CRUD operations.
 */
export class JobManager extends CoreBaseManager {
  /**
   * Creates a job.
   * @param {object} data - Job payload.
   * @returns {Promise<object>} Created row.
   */
  async create(data) {
    const [created] = await this.db.insert(jobs).values(data).returning();
    return created;
  }

  /**
   * Retrieves a job by ID.
   * @param {number} id - Job ID.
   * @returns {Promise<object|null>} Job or null.
   */
  async getById(id) {
    const rows = await this.db.select().from(jobs).where(eq(jobs.job_id, id)).limit(1);
    return rows[0] || null;
  }

  /**
   * Lists all jobs.
   * @returns {Promise<object[]>} Jobs.
   */
  async list() {
    return this.db.select().from(jobs);
  }

  /**
   * Updates a job.
   * @param {number} id - Job ID.
   * @param {object} updates - Fields to update.
   * @returns {Promise<object|null>} Updated row or null.
   */
  async update(id, updates) {
    const [updated] = await this.db
      .update(jobs)
      .set(updates)
      .where(eq(jobs.job_id, id))
      .returning();
    return updated || null;
  }

  /**
   * Deletes a job by ID.
   * @param {number} id - Job ID.
   * @returns {Promise<object|null>} Deleted row or null.
   */
  async delete(id) {
    const [deleted] = await this.db.delete(jobs).where(eq(jobs.job_id, id)).returning();
    return deleted || null;
  }
}
