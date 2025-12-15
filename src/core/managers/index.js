import DPI from 'js-dep-injector';
import { TYPES } from '../types.js';

import { ApplicationManager } from './ApplicationManager.js';
import { CandidateManager } from './CandidateManager.js';
import { IndexingQueueManager } from './IndexingQueueManager.js';
import { InterviewManager } from './InterviewManager.js';
import { JobManager } from './JobManager.js';
import { OneWayInterviewManager } from './OneWayInterviewManager.js';
import { RecruiterCommentManager } from './RecruiterCommentManager.js';
import { RecruiterManager } from './RecruiterManager.js';
import { SkillManager } from './SkillManager.js';
import { VectorDBManager } from './VectorDBManager.js';

DPI.factory(TYPES.CandidateManager, () => new CandidateManager());
DPI.factory(TYPES.JobManager, () => new JobManager());
DPI.factory(TYPES.ApplicationManager, () => new ApplicationManager());
DPI.factory(TYPES.InterviewManager, () => new InterviewManager());
DPI.factory(TYPES.RecruiterManager, () => new RecruiterManager());
DPI.factory(TYPES.RecruiterCommentManager, () => new RecruiterCommentManager());
DPI.factory(TYPES.SkillManager, () => new SkillManager());
DPI.factory(TYPES.IndexingQueueManager, () => new IndexingQueueManager());
DPI.factory(TYPES.VectorDBManager, () => new VectorDBManager());
DPI.factory(TYPES.OneWayInterviewManager, () => new OneWayInterviewManager());

export {
  CandidateManager,
  JobManager,
  ApplicationManager,
  InterviewManager,
  RecruiterManager,
  RecruiterCommentManager,
  SkillManager,
  IndexingQueueManager,
  VectorDBManager,
  OneWayInterviewManager,
};
