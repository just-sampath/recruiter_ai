import { recruiterComments } from '../db/recruiter_comments/schema.js';
import { CoreBaseManager } from './base/CoreBaseManager.js';

/**
 * Handles recruiter comments persistence.
 */
export class RecruiterCommentManager extends CoreBaseManager {
  /**
   * Creates a recruiter comment.
   * @param {object} payload - Comment payload.
   * @param {number} payload.application_id - Related application ID.
   * @param {string} payload.author - Author name/email.
   * @param {string} payload.comment_text - Comment text.
   * @returns {Promise<object>} Created row.
   */
  async create(payload) {
    const [created] = await this.db.insert(recruiterComments).values(payload).returning();
    return created;
  }
}
