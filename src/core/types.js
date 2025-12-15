/**
 * DPI service identifiers used throughout the application.
 */
export const TYPES = {
  // Core
  Config: 'Config',
  Database: 'Database',
  Logger: 'Logger',

  // Services
  EmbeddingService: 'EmbeddingService',
  SparseEmbeddingService: 'SparseEmbeddingService',
  VectorDBService: 'VectorDBService',

  // AI Services
  AIService: 'AIService',
  RerankerService: 'RerankerService',
  LLMReranker: 'LLMReranker',
  QueryExtractor: 'QueryExtractor',
  ExplanationGenerator: 'ExplanationGenerator',

  // Managers
  CandidateManager: 'CandidateManager',
  JobManager: 'JobManager',
  ApplicationManager: 'ApplicationManager',
  InterviewManager: 'InterviewManager',
  RecruiterManager: 'RecruiterManager',
  RecruiterCommentManager: 'RecruiterCommentManager',
  OneWayInterviewManager: 'OneWayInterviewManager',
  SkillManager: 'SkillManager',
  IndexingQueueManager: 'IndexingQueueManager',
  VectorDBManager: 'VectorDBManager',

  // Queues
  ProcessDocumentsQueue: 'ProcessDocumentsQueue',

  // Handlers
  SearchHandler: 'SearchHandler',
  DocumentProcessor: 'DocumentProcessor',

  // Utils
  FuzzyMatcher: 'FuzzyMatcher',
};
