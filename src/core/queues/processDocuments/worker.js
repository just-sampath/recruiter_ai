import { Worker } from 'bullmq';
import config from 'config';
import DPI from 'js-dep-injector';
import { TYPES } from '../../types.js';

const queueConfig = config.get('queue');
const redisConfig = config.get('redis');

const connection = {
  host: process.env.REDIS_HOST || redisConfig.host,
  port: Number(process.env.REDIS_PORT || redisConfig.port),
  password: redisConfig.password || undefined,
  tls: redisConfig.tls ? {} : undefined,
};

const queueName = queueConfig.name;

/**
 * BullMQ worker that delegates to DocumentProcessor.
 */
export const processDocumentsWorker = new Worker(
  queueName,
  async (job) => {
    const processor = DPI.get(TYPES.DocumentProcessor);
    await processor.process(job.data.indexingId);
  },
  {
    connection,
    concurrency: queueConfig.concurrency,
  }
);

processDocumentsWorker.on('failed', (job, err) => {
  const logger = DPI.get(TYPES.Logger);
  logger.error({ jobId: job?.id, err }, 'Document processing job failed');
});
