import { Hono } from 'hono';
import { recruiterOnly } from '../../middleware/auth.js';
import { addRecruiterComment, getApplicationById } from './controller.js';
import { listApplications } from './list.js';

const router = new Hono();

// Apply lives only on POST /api/jobs/:id/apply (removed applications footgun).
router.post('/:id/comments', recruiterOnly, addRecruiterComment);
router.get('/', recruiterOnly, listApplications);
router.get('/:id', recruiterOnly, getApplicationById);

export default router;
