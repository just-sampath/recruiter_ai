import './core/container.js';
import config from 'config';
import { app } from './app.js';

const port = Number(process.env.PORT || config.get('server.port'));

const server = Bun.serve({
  fetch: app.fetch,
  port,
});

console.log(`🚀 Recruiter AI server running on http://localhost:${server.port}`);
