import { z } from 'zod';

export const searchSchema = z.object({
  query: z.string().min(1),
  job_id: z.number().int().positive().optional(),
  top_k: z.number().int().min(1).max(20).optional(),
});
