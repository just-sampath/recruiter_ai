import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from '../../utils/auth.js';
import { recruiters } from '../db/recruiters/schema.js';
import { CoreBaseManager } from './base/CoreBaseManager.js';

/**
 * Recruiter authentication and management.
 */
export class RecruiterManager extends CoreBaseManager {
  /**
   * Creates a recruiter.
   * @param {object} payload - Recruiter fields including password.
   * @returns {Promise<object>} Created recruiter.
   */
  async create(payload) {
    const { password, ...rest } = payload;
    const password_hash = await hashPassword(password);
    const [created] = await this.db
      .insert(recruiters)
      .values({ ...rest, password_hash })
      .returning();
    return created;
  }

  /**
   * Retrieves recruiter by email.
   * @param {string} email - Email address.
   * @returns {Promise<object|null>} Recruiter or null.
   */
  async getByEmail(email) {
    const rows = await this.db
      .select()
      .from(recruiters)
      .where(eq(recruiters.email, email))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * Retrieves recruiter by ID.
   * @param {number} id - Recruiter ID.
   * @returns {Promise<object|null>} Recruiter or null.
   */
  async getById(id) {
    const rows = await this.db
      .select()
      .from(recruiters)
      .where(eq(recruiters.recruiter_id, id))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * Verifies login credentials.
   * @param {string} email - Email address.
   * @param {string} password - Plain password.
   * @returns {Promise<object|null>} Recruiter if credentials are valid, else null.
   */
  async validateLogin(email, password) {
    const recruiter = await this.getByEmail(email);
    if (!recruiter) {
      return null;
    }
    const ok = await verifyPassword(password, recruiter.password_hash);
    return ok ? recruiter : null;
  }

  /**
   * Lists recruiters.
   * @returns {Promise<object[]>} Recruiter rows.
   */
  async list() {
    return this.db.select().from(recruiters);
  }

  /**
   * Updates recruiter fields.
   * @param {number} id - Recruiter ID.
   * @param {object} updates - Fields to update.
   * @returns {Promise<object|null>} Updated recruiter or null.
   */
  async update(id, updates) {
    const payload = { ...updates };
    if (payload.password) {
      payload.password_hash = await hashPassword(payload.password);
      // biome-ignore lint/performance/noDelete: delete is required here - Drizzle ORM treats undefined differently than missing properties
      delete payload.password;
    }
    const [updated] = await this.db
      .update(recruiters)
      .set(payload)
      .where(eq(recruiters.recruiter_id, id))
      .returning();
    return updated || null;
  }

  /**
   * Deletes a recruiter.
   * @param {number} id - Recruiter ID.
   * @returns {Promise<object|null>} Deleted row or null.
   */
  async delete(id) {
    const [deleted] = await this.db
      .delete(recruiters)
      .where(eq(recruiters.recruiter_id, id))
      .returning();
    return deleted || null;
  }
}
