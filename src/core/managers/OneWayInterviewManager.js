import { eq } from 'drizzle-orm';
import { jobApplications } from '../db/applications/schema.js';
import { oneWayInterviews } from '../db/one_way_interviews/schema.js';
import { oneWayTranscripts } from '../db/one_way_transcripts/schema.js';
import { CoreBaseManager } from './base/CoreBaseManager.js';

/**
 * Manages one-way interviews and transcripts.
 */
export class OneWayInterviewManager extends CoreBaseManager {
  /**
   * Retrieves a one-way interview by ID.
   * @param {number} id - One-way interview ID.
   * @returns {Promise<object|null>} Row or null.
   */
  async getById(id) {
    const rows = await this.db
      .select()
      .from(oneWayInterviews)
      .where(eq(oneWayInterviews.one_way_interview_id, id))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * Adds a transcript entry to a one-way interview.
   * @param {number} oneWayInterviewId - Interview ID.
   * @param {string} questionText - Question text.
   * @param {string} answerText - Answer text.
   * @returns {Promise<object>} Created transcript.
   */
  async addTranscript(oneWayInterviewId, questionText, answerText) {
    const [created] = await this.db
      .insert(oneWayTranscripts)
      .values({
        one_way_interview_id: oneWayInterviewId,
        question_text: questionText,
        answer_text: answerText,
      })
      .returning();
    return created;
  }

  /**
   * Returns application context for a one-way interview.
   * @param {number} oneWayInterviewId - Interview ID.
   * @returns {Promise<object|null>} Application row or null.
   */
  async getApplicationContext(oneWayInterviewId) {
    const interview = await this.getById(oneWayInterviewId);
    if (!interview) {
      return null;
    }
    const rows = await this.db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.application_id, interview.application_id))
      .limit(1);
    return rows[0] || null;
  }
}
