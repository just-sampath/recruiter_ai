import { Hono } from 'hono';
import { candidateOnly, recruiterOnly } from '../../middleware/auth.js';
import { addRecruiterComment, applyToJob, getApplicationById } from './controller.js';
import { listApplications } from './list.js';

const router = new Hono();

router.post('/:id/apply', candidateOnly, applyToJob);
router.post('/:id/comments', recruiterOnly, addRecruiterComment);
router.get('/', recruiterOnly, listApplications);
router.get('/:id', recruiterOnly, getApplicationById);

export default router;
