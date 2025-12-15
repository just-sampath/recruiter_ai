import { Hono } from 'hono';
import { candidateOnly, recruiterOnly } from '../../middleware/auth.js';
import { applyToJob } from '../applications/controller.js';
import { createJob, getJob, listJobs } from './controller.js';
import { deleteJob, updateJob } from './updateDelete.js';

const router = new Hono();

router.get('/', recruiterOnly, listJobs);
router.post('/', recruiterOnly, createJob);
router.get('/:id', recruiterOnly, getJob);
router.put('/:id', recruiterOnly, updateJob);
router.delete('/:id', recruiterOnly, deleteJob);
router.post('/:id/apply', candidateOnly, applyToJob);

export default router;
