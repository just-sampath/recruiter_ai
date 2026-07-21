import { z } from 'zod';
import { USER_ROLES } from '../../utils/constants.js';

export const recruiterCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().min(1),
  role: z.enum([USER_ROLES.RECRUITER, USER_ROLES.SUPERADMIN]).optional(),
});
