import { eq, sql } from 'drizzle-orm';
import { indexingQueue } from '../db/indexing_queue/schema.js';
import { CoreBaseManager } from './base/CoreBaseManager.js';

/**
 * Manages indexing_queue records.
 */
export class IndexingQueueManager extends CoreBaseManager {
  /**
   * Creates a new indexing event record.
   * @param {object} payload - Event payload.
   * @returns {Promise<object>} Inserted record.
   */
  async createEvent(payload) {
    const [created] = await this.db.insert(indexingQueue).values(payload).returning();
    return created;
  }

  /**
   * Fetches a single event by ID.
   * @param {number} id - Event ID.
   * @returns {Promise<object|null>} Event row or null.
   */
  async getById(id) {
    const rows = await this.db
      .select()
      .from(indexingQueue)
      .where(eq(indexingQueue.id, id))
      .limit(1);
    return rows[0] || null;
  }

  /**
   * Fetches pending events for processing.
   * @param {number} limit - Max rows to fetch.
   * @returns {Promise<object[]>} Pending rows.
   */
  async getPendingBatch(limit) {
    return this.db
      .select()
      .from(indexingQueue)
      .where(eq(indexingQueue.status, 'pending'))
      .limit(limit);
  }

  /**
   * Marks an event as processing.
   * @param {number} id - Row ID.
   * @returns {Promise<void>}
   */
  async markProcessing(id) {
    await this.db
      .update(indexingQueue)
      .set({ status: 'processing', processed_at: sql`now()` })
      .where(eq(indexingQueue.id, id));
  }

  /**
   * Marks an event as completed.
   * @param {number} id - Row ID.
   * @returns {Promise<void>}
   */
  async markCompleted(id) {
    await this.db
      .update(indexingQueue)
      .set({ status: 'completed', processed_at: sql`now()`, error_message: null })
      .where(eq(indexingQueue.id, id));
  }

  /**
   * Marks an event as failed and increments retry counter.
   * @param {number} id - Row ID.
   * @param {string} message - Failure reason.
   * @returns {Promise<void>}
   */
  async markFailed(id, message) {
    await this.db
      .update(indexingQueue)
      .set({
        status: 'failed',
        retry_count: sql`${indexingQueue.retry_count} + 1`,
        error_message: message,
      })
      .where(eq(indexingQueue.id, id));
  }
}
