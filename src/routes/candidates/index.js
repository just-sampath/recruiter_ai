import { Hono } from 'hono';
import { candidateOnly, recruiterOnly, superadminOnly } from '../../middleware/auth.js';
import { getCandidateById, updateCandidate } from './controller.js';
import { listCandidates } from './list.js';
import { getMe, updateMe } from './me.js';

const router = new Hono();

router.get('/me', candidateOnly, getMe);
router.put('/me', candidateOnly, updateMe);
router.get('/', recruiterOnly, listCandidates);
router.get('/:id', recruiterOnly, getCandidateById);
router.put('/:id', superadminOnly, updateCandidate);

export default router;
