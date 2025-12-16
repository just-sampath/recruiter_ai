import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { errorHandler, requestLogger } from './middleware/index.js';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';

const app = new Hono();

// CORS middleware for frontend
app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5175',  // Docker frontend
    'http://127.0.0.1:5175',
  ],
  credentials: true,
}));

app.use('*', async (c, next) => {
  c.set('logger', logger);
  await next();
});
app.use('*', requestLogger);
app.route('/api', routes);
app.onError(errorHandler);

export { app };
