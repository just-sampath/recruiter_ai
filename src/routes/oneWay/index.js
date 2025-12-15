import { Hono } from 'hono';
import { recruiterOnly } from '../../middleware/auth.js';
import { addOneWayTranscript } from './controller.js';

const router = new Hono();

router.post('/:id/transcript', recruiterOnly, addOneWayTranscript);

export default router;
