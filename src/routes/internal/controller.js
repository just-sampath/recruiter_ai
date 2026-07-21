import { config as loadEnv } from 'dotenv';
import { DPI } from '../../core/container.js';
import { ensureSchema } from '../../core/db/migrate.js';
import { TYPES } from '../../core/types.js';

loadEnv();

async function ensureDatabase() {
  await ensureSchema({ closeConnection: false });
}

async function ensureQdrant() {
  await DPI.get(TYPES.VectorDBService).ensureCollection();
}

export async function main(c) {
  await ensureDatabase();
  await ensureQdrant();
  const logger = DPI.get(TYPES.Logger);
  logger.info('Initialization complete: database and Qdrant collection ensured');
  return c.json({ message: 'Initialization complete' });
}
