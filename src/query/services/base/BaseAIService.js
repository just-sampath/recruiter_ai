import config from 'config';
import DPI from 'js-dep-injector';
import { TYPES } from '../../../core/types.js';

/**
 * Base class for AI-related services.
 */
export class BaseAIService {
  constructor() {
    this.dpi = DPI;
  }

  /**
   * Pino logger instance.
   * @returns {import('pino').Logger}
   */
  get logger() {
    return this.dpi.get(TYPES.Logger);
  }

  /**
   * Config object from node-config.
   * @returns {import('config').IConfig}
   */
  get config() {
    try {
      return this.dpi.get(TYPES.Config);
    } catch (err) {
      return config;
    }
  }

  /**
   * Database instance.
   * @returns {import('drizzle-orm').PostgresJsDatabase}
   */
  get db() {
    return this.dpi.get(TYPES.Database);
  }
}
