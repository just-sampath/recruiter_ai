import { z } from 'zod';

export const importFormSchema = z.object({
  file: z.any(),
  shouldTruncate: z.union([z.boolean(), z.string()]).optional(),
});
