import DPI from 'js-dep-injector';
import { TYPES } from '../types.js';
import { ProcessDocumentsQueue } from './processDocuments/queue.js';
import './processDocuments/worker.js';

DPI.factory(TYPES.ProcessDocumentsQueue, () => new ProcessDocumentsQueue());

export { ProcessDocumentsQueue };
