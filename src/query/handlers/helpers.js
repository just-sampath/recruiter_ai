import { eq } from 'drizzle-orm';
import { candidateResumes } from '../../core/db/candidate_resumes/schema.js';
import { interviewTranscripts } from '../../core/db/interview_transcripts/schema.js';
import { oneWayTranscripts } from '../../core/db/one_way_transcripts/schema.js';
import { recruiterComments } from '../../core/db/recruiter_comments/schema.js';
import { screeningAnswers } from '../../core/db/screening_answers/schema.js';
import { screeningQuestions } from '../../core/db/screening_questions/schema.js';
import { DOC_TYPES } from '../../utils/constants.js';

/**
 * Retrieves full text content for a document by type and source ID.
 * @param {import('drizzle-orm').PostgresJsDatabase} db - Database instance.
 * @param {string} docType - Document type (resume, interview_transcript, etc).
 * @param {number} sourceId - Source row ID.
 * @returns {Promise<string|null>} Document text content or null.
 */
export async function fetchDocText(db, docType, sourceId) {
  if (!docType || !sourceId) return null;

  try {
    if (docType === DOC_TYPES.RESUME) {
      const rows = await db
        .select()
        .from(candidateResumes)
        .where(eq(candidateResumes.resume_id, sourceId))
        .limit(1);
      return rows[0]?.resume_text || null;
    }

    if (docType === DOC_TYPES.INTERVIEW_TRANSCRIPT) {
      const rows = await db
        .select()
        .from(interviewTranscripts)
        .where(eq(interviewTranscripts.transcript_id, sourceId))
        .limit(1);
      return rows[0]?.transcript_text || null;
    }

    if (docType === DOC_TYPES.ONE_WAY_TRANSCRIPT) {
      const rows = await db
        .select()
        .from(oneWayTranscripts)
        .where(eq(oneWayTranscripts.transcript_id, sourceId))
        .limit(1);
      if (!rows[0]) return null;
      return `${rows[0].question_text}\n${rows[0].answer_text}`;
    }

    if (docType === DOC_TYPES.RECRUITER_COMMENT) {
      const rows = await db
        .select()
        .from(recruiterComments)
        .where(eq(recruiterComments.comment_id, sourceId))
        .limit(1);
      return rows[0]?.comment_text || null;
    }

    if (docType === DOC_TYPES.SCREENING_ANSWER) {
      const rows = await db
        .select({
          answer_text: screeningAnswers.answer_text,
          question_text: screeningQuestions.question_text,
        })
        .from(screeningAnswers)
        .leftJoin(
          screeningQuestions,
          eq(screeningAnswers.question_id, screeningQuestions.question_id)
        )
        .where(eq(screeningAnswers.answer_id, sourceId))
        .limit(1);
      if (!rows[0]?.answer_text) return null;
      if (rows[0].question_text) {
        return `Question: ${rows[0].question_text}\nAnswer: ${rows[0].answer_text}`;
      }
      return rows[0].answer_text;
    }

    return null;
  } catch (err) {
    console.error('fetchDocText error:', err);
    return null;
  }
}
