import { z } from 'zod';

export const jobCreateSchema = z.object({
  job_title: z.string().min(1),
  department: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
});
