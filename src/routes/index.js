import { Hono } from 'hono';
import applicationsRoutes from './applications/index.js';
import authRoutes from './auth/index.js';
import candidatesRoutes from './candidates/index.js';
import importRoutes from './import/index.js';
import interviewsRoutes from './interviews/index.js';
import jobsRoutes from './jobs/index.js';
import oneWayRoutes from './oneWay/index.js';
import recruitersRoutes from './recruiters/index.js';
import searchRoutes from './search/index.js';
import internalRoutes from './internal/index.js';

const routes = new Hono();

routes.route('/auth', authRoutes);
routes.route('/candidates', candidatesRoutes);
routes.route('/jobs', jobsRoutes);
routes.route('/applications', applicationsRoutes);
routes.route('/interviews', interviewsRoutes);
routes.route('/one-way-interviews', oneWayRoutes);
routes.route('/recruiters', recruitersRoutes);
routes.route('/import', importRoutes);
routes.route('/search', searchRoutes);
routes.route('/internal', internalRoutes);

export default routes;
