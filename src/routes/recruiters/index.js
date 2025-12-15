import { Hono } from 'hono';
import { superadminOnly } from '../../middleware/auth.js';
import { createRecruiter, deleteRecruiter, getRecruiter, updateRecruiter } from './controller.js';
import { listRecruiters } from './list.js';

const router = new Hono();

router.post('/', superadminOnly, createRecruiter);
router.get('/', superadminOnly, listRecruiters);
router.get('/:id', superadminOnly, getRecruiter);
router.put('/:id', superadminOnly, updateRecruiter);
router.delete('/:id', superadminOnly, deleteRecruiter);

export default router;
