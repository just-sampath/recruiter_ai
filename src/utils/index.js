import DPI from 'js-dep-injector';
import { TYPES } from '../core/types.js';
import { FuzzyMatcher } from './fuzzyMatch.js';
import { logger } from './logger.js';

DPI.factory(TYPES.FuzzyMatcher, () => new FuzzyMatcher());

export { FuzzyMatcher, logger };
