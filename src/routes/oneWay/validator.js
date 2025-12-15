import { z } from 'zod';

export const oneWayTranscriptSchema = z.object({
  question_text: z.string().min(1),
  answer_text: z.string().min(1),
});
