import { Hono } from 'hono';
import { candidateLogin, candidateRegister, recruiterLogin } from './controller.js';

const router = new Hono();

router.post('/candidate/register', candidateRegister);
router.post('/candidate/login', candidateLogin);
router.post('/recruiter/login', recruiterLogin);

export default router;
