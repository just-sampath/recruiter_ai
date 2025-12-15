import DPI from 'js-dep-injector';
import { TYPES } from '../../types.js';

/**
 * Base class for managers to access shared dependencies.
 */
export class CoreBaseManager {
  constructor() {
    this.dpi = DPI;
  }

  /**
   * Drizzle database instance.
   * @returns {}
   */
  get db() {
    return this.dpi.get(TYPES.Database);
  }

  /**
   * Pino logger instance.
   * @returns {import('pino').Logger}
   */
  get logger() {
    return this.dpi.get(TYPES.Logger);
  }
}
