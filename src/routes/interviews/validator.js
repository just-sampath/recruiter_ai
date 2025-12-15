import { z } from 'zod';

export const transcriptSchema = z.object({
  transcript_text: z.string().min(1),
});

export const scorecardSchema = z.object({
  overall_score: z.number().min(0).max(5).optional(),
  problem_solving: z.number().min(0).max(5).optional(),
  communication: z.number().min(0).max(5).optional(),
  ownership: z.number().min(0).max(5).optional(),
  culture_fit: z.number().min(0).max(5).optional(),
  notes: z.string().optional(),
});
