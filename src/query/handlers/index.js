import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { SearchHandler } from './search.js';

DPI.factory(TYPES.SearchHandler, () => new SearchHandler());

export { SearchHandler };
