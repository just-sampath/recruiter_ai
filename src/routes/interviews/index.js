import { Hono } from 'hono';
import { recruiterOnly } from '../../middleware/auth.js';
import { addScorecard, addTranscript, getInterview } from './controller.js';
import { listInterviews } from './list.js';

const router = new Hono();

router.get('/:id', recruiterOnly, getInterview);
router.post('/:id/transcript', recruiterOnly, addTranscript);
router.post('/:id/scorecard', recruiterOnly, addScorecard);
router.get('/', recruiterOnly, listInterviews);

export default router;
