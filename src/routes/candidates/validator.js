import { z } from 'zod';

export const candidateUpdateSchema = z.object({
  phone: z.string().optional(),
  current_location: z.string().optional(),
  preferred_work_type: z.string().optional(),
  notice_period_days: z.number().int().optional(),
  can_join_immediately: z.boolean().optional(),
  expected_salary_lpa: z.number().optional(),
  resume_text: z.string().optional(),
});
