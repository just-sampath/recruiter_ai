import { Hono } from 'hono';
import { requireInternalToken } from '../../middleware/auth.js';
import { main } from './controller.js';

const router = new Hono();

router.post('/init', requireInternalToken, main);

export default router;
