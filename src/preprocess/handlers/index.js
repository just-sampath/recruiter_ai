import DPI from 'js-dep-injector';
import { TYPES } from '../../core/types.js';
import { DocumentProcessor } from './documentProcessor.js';

DPI.factory(TYPES.DocumentProcessor, () => new DocumentProcessor());

export { DocumentProcessor };
