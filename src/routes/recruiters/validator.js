import { z } from 'zod';

export const recruiterCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: z.string().optional(),
});
