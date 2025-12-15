import { Hono } from 'hono';
import { main } from './controller.js';

const router = new Hono();

router.post('/init', main);

export default router;
