import config from 'config';
import DPI from 'js-dep-injector';
import { logger } from '../utils/logger.js';
import { db } from './db/index.js';
import { TYPES } from './types.js';

// Core modules
DPI.module(TYPES.Config, config);
DPI.module(TYPES.Database, db);
DPI.module(TYPES.Logger, logger);

// Register utilities and services
import '../utils/index.js';
import './services/index.js';
import './managers/index.js';
import './queues/index.js';
import '../preprocess/index.js';
import '../query/index.js';

export { DPI };
