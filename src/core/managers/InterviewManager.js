import { eq } from 'drizzle-orm';
import { jobApplications } from '../db/applications/schema.js';
import { interviewScorecards } from '../db/interview_scorecards/schema.js';
import { interviewTranscripts } from '../db/interview_transcripts/schema.js';
import { interviews } from '../db/interviews/schema.js';
import { CoreBaseManager } from './base/CoreBaseManager.js';

/**
 * Interview manager for rounds, transcripts, and scorecards.
 */
export class InterviewManager extends CoreBaseManager {
  /**
   * Creates an interview round.
   * @param {object} payload - Interview data.
   * @returns {Promise<object>} Created interview.
   */
  async create(payload) {
    const [created] = await this.db.insert(interviews).values(payload).returning();
    return created;
  }

  /**
   * Retrieves an interview by ID.
   * @param {number} id - Interview ID.
   * @returns {Promise<object|null>} Interview row or null.
   */
  async getById(id) {
    const rows = await this.db
      .select()
      .from(interviews)
      .where(eq(interviews.interview_id, id))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * Adds a transcript entry.
   * @param {number} interviewId - Interview ID.
   * @param {string} transcriptText - Transcript content.
   * @returns {Promise<object>} Created transcript.
   */
  async addTranscript(interviewId, transcriptText) {
    const [created] = await this.db
      .insert(interviewTranscripts)
      .values({ interview_id: interviewId, transcript_text: transcriptText })
      .returning();
    return created;
  }

  /**
   * Adds a scorecard.
   * @param {number} interviewId - Interview ID.
   * @param {object} payload - Scorecard fields.
   * @returns {Promise<object>} Created scorecard.
   */
  async addScorecard(interviewId, payload) {
    const [created] = await this.db
      .insert(interviewScorecards)
      .values({ ...payload, interview_id: interviewId })
      .returning();
    return created;
  }

  /**
   * Fetches transcript by ID.
   * @param {number} transcriptId - Transcript ID.
   * @returns {Promise<object|null>} Transcript row or null.
   */
  async getTranscript(transcriptId) {
    const rows = await this.db
      .select()
      .from(interviewTranscripts)
      .where(eq(interviewTranscripts.transcript_id, transcriptId))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * Retrieves the related application for an interview.
   * @param {number} interviewId - Interview ID.
   * @returns {Promise<object|null>} Application row or null.
   */
  async getApplicationForInterview(interviewId) {
    const interview = await this.getById(interviewId);
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

  /**
   * Lists all interviews.
   * @returns {Promise<object[]>} Interviews.
   */
  async list() {
    return this.db.select().from(interviews);
  }
}
