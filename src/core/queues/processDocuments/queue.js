import { Queue } from 'bullmq';
import config from 'config';
import { BaseService } from '../../services/base/BaseService.js';
import { TYPES } from '../../types.js';

const queueConfig = config.get('queue');
const redisConfig = config.get('redis');

/**
 * BullMQ queue wrapper for document processing.
 */
export class ProcessDocumentsQueue extends BaseService {
  constructor() {
    super();
    const connection = {
      host: process.env.REDIS_HOST || redisConfig.host,
      port: Number(process.env.REDIS_PORT || redisConfig.port),
      password: redisConfig.password || undefined,
      tls: redisConfig.tls ? {} : undefined,
    };
    this.queue = new Queue(queueConfig.name, { connection });
  }

  /**
   * Enqueues an indexing event by persisting to DB and scheduling a BullMQ job.
   * @param {object} payload - IndexingQueue payload.
   * @returns {Promise<object>} Created indexing_queue row.
   */
  async enqueue(payload) {
    const event = await this.dpi.get(TYPES.IndexingQueueManager).createEvent(payload);
    await this.queue.add(
      'process-document',
      { indexingId: event.id },
      {
        attempts: queueConfig.maxRetries,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 500,
        removeOnFail: 1000,
      }
    );
    return event;
  }
}
