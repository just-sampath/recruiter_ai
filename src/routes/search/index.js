import { Hono } from 'hono';
import { recruiterOnly } from '../../middleware/auth.js';
import { searchCandidates } from './controller.js';

const router = new Hono();

router.post('/', recruiterOnly, searchCandidates);

export default router;
