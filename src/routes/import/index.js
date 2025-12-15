import { Hono } from 'hono';
import { superadminOnly } from '../../middleware/auth.js';
import { importXlsx } from './controller.js';

const router = new Hono();

router.post('/xlsx', superadminOnly, importXlsx);

export default router;
