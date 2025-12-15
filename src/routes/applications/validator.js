import { z } from 'zod';

export const recruiterCommentSchema = z.object({
  comment_text: z.string().min(1),
});
