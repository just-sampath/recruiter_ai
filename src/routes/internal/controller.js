import { config as loadEnv } from 'dotenv';
import { DPI } from '../../../src/core/container.js';
import { connection } from '../../../src/core/db/index.js';
import { ensureSchema } from '../../../src/core/db/migrate.js';
import { TYPES } from '../../../src/core/types.js';

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
  await connection.end();
  const logger = DPI.get(TYPES.Logger);
  logger.info('Initialization complete: database and Qdrant collection ensured');
  return c.json({ message: 'Initialization complete' });

}


