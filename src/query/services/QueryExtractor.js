import { TYPES } from '../../core/types.js';
import { SEARCH_STRATEGIES } from '../../utils/constants.js';
import { BaseAIService } from './base/BaseAIService.js';

/**
 * JSON schema for LLM structured output.
 * Classifies query into search strategy and extracts filterable columns.
 */
const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    search_strategy: {
      type: 'string',
      enum: ['structured', 'hybrid', 'semantic'],
      description:
        'Level 0=structured (SQL only), Level 1=hybrid (SQL filters + vector), Level 2=semantic (vector only)',
    },
    strategy_explanation: {
      type: 'string',
      description: 'Brief explanation of why this strategy was chosen',
    },
    semantic_query: {
      type: 'string',
      description: 'Concise text to embed for vector search. Empty for pure structured queries.',
    },
    extracted_filters: {
      type: 'object',
      properties: {
        locations: {
          type: 'array',
          items: { type: 'string' },
          description: 'City names from current_location',
        },
        skills: {
          type: 'array',
          items: { type: 'string' },
          description: 'Skill names to filter on',
        },
        experience_min: {
          type: 'number',
          description: 'Minimum years of experience',
        },
        experience_max: {
          type: 'number',
          description: 'Maximum years of experience',
        },
        notice_period_max: {
          type: 'number',
          description: 'Maximum notice period in days (0 = immediate)',
        },
        can_join_immediately: {
          type: 'boolean',
          description: 'True if candidate can join immediately',
        },
        expected_salary_min: {
          type: 'number',
          description: 'Minimum expected salary in LPA',
        },
        expected_salary_max: {
          type: 'number',
          description: 'Maximum expected salary in LPA',
        },
        preferred_work_type: {
          type: 'string',
          enum: ['Remote', 'Onsite', 'Hybrid'],
          description: 'Work type preference',
        },
        current_company: {
          type: 'string',
          description: 'Company name to match (partial match)',
        },
      },
      required: [],
    },
  },
  required: ['search_strategy', 'strategy_explanation', 'semantic_query', 'extracted_filters'],
};

/**
 * Available columns description sent to LLM for context.
 */
const COLUMNS_DESCRIPTION = `
Available filterable columns (extract values ONLY if explicitly mentioned in query):

CANDIDATES TABLE:
- current_location (string): City name, e.g., "Delhi", "Bangalore", "Hyderabad"
- total_experience_years (number): Years of experience, e.g., 5, 10
- notice_period_days (integer): Days until can join. 0 means immediate joiner.
- can_join_immediately (boolean): True if notice_period is 0
- expected_salary_lpa (number): Expected salary in Lakhs Per Annum
- preferred_work_type (string): "Remote", "Onsite", or "Hybrid"
- current_company (string): Company name like "Google", "Microsoft"

SKILLS TABLE (via candidate_skills join):
- skill_name (string): Technical skills like "React", "Docker", "Python", "AWS"

STRATEGY GUIDANCE:
- STRUCTURED (Level 0): Use when query can be answered purely with SQL filters on above columns.
  Examples: "immediate joiners in Delhi", "engineers with >5 years experience", "candidates with React skill"
  
- HYBRID (Level 1): Use when query has BOTH filterable criteria AND conceptual/keyword search.
  Examples: "candidates in Hyderabad who mention Docker", "Backend Engineers discussing production issues"
  
- SEMANTIC (Level 2): Use when query requires understanding meaning from text (resumes, transcripts, comments).
  Examples: "who demonstrates ownership", "strong system design knowledge", "good communication skills"
`.trim();

/**
 * Extracts structured filters and search strategy from natural language queries.
 */
export class QueryExtractor extends BaseAIService {
  /**
   * Extracts query intent via LLM with structured output.
   * @param {string} query - Natural language recruiter query.
   * @returns {Promise<{search_strategy: string, strategy_explanation: string, semantic_query: string, extracted_filters: object}>}
   */
  async extract(query) {
    const logger = this.logger;
    logger.info({ query }, 'QueryExtractor: extracting intent');

    try {
      const prompt = this._buildPrompt(query);
      const ai = this.dpi.get(TYPES.AIService);
      const raw = await ai.structuredOutput(prompt, EXTRACTION_SCHEMA);

      logger.debug({ raw }, 'QueryExtractor: raw LLM response');

      const normalizedSkills = await this._normalizeSkills(raw.extracted_filters?.skills || []);

      const result = {
        search_strategy: raw.search_strategy || SEARCH_STRATEGIES.HYBRID,
        strategy_explanation: raw.strategy_explanation || '',
        semantic_query: raw.semantic_query || query,
        extracted_filters: {
          ...raw.extracted_filters,
          skills: normalizedSkills,
        },
      };

      logger.info(
        { strategy: result.search_strategy, filters: result.extracted_filters },
        'QueryExtractor: extraction complete'
      );

      return result;
    } catch (err) {
      logger.error({ err, query }, 'QueryExtractor: extraction failed');
      throw err;
    }
  }

  /**
   * Builds the prompt for LLM extraction.
   * @param {string} query - User query.
   * @returns {string} Formatted prompt.
   */
  _buildPrompt(query) {
    return [
      'You are a query classifier for a candidate search system.',
      'Analyze the query and extract filters + classify the search strategy.',
      '',
      COLUMNS_DESCRIPTION,
      '',
      'IMPORTANT RULES:',
      '- Only extract filter values that are EXPLICITLY mentioned in the query.',
      '- Do NOT invent or assume values.',
      '- For semantic queries, semantic_query should be the conceptual part to search.',
      '- For structured queries, semantic_query can be empty.',
      '',
      `User Query: "${query}"`,
      '',
      'Return JSON matching the schema.',
    ].join('\n');
  }

  /**
   * Normalizes skills by fuzzy matching against the database skill list.
   * @param {string[]} skills - Raw skill names from extraction.
   * @returns {Promise<string[]>} Normalized skill names.
   */
  async _normalizeSkills(skills) {
    if (!skills.length) return [];

    try {
      const skillManager = this.dpi.get(TYPES.SkillManager);
      await skillManager.getAll({ refreshMatcher: true });
      const matcher = this.dpi.get(TYPES.FuzzyMatcher);

      return skills.map((skill) => {
        const match = matcher.findBest(skill);
        return match?.skill_name || skill;
      });
    } catch (err) {
      this.logger.warn({ err }, 'QueryExtractor: skill normalization failed, using raw values');
      return skills;
    }
  }
}
