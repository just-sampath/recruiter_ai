import { Hono } from 'hono';
import { errorHandler, requestLogger } from './middleware/index.js';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';

const app = new Hono();

app.use('*', async (c, next) => {
  c.set('logger', logger);
  await next();
});
app.use('*', requestLogger);
app.route('/api', routes);
app.onError(errorHandler);

export { app };
