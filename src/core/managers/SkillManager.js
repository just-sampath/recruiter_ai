import { eq } from 'drizzle-orm';
import { skills } from '../db/skills/schema.js';
import { TYPES } from '../types.js';
import { CoreBaseManager } from './base/CoreBaseManager.js';

/**
 * Skill management and fuzzy matcher hydration.
 */
export class SkillManager extends CoreBaseManager {
  /**
   * Lists all skills and refreshes fuzzy matcher by default.
   * @param {object} [options] - Options.
   * @param {boolean} [options.refreshMatcher=true] - Whether to refresh Fuse corpus.
   * @returns {Promise<object[]>} Skills.
   */
  async getAll({ refreshMatcher = true } = {}) {
    const rows = await this.db.select().from(skills);
    if (refreshMatcher) {
      this.dpi.get(TYPES.FuzzyMatcher).setCorpus(rows);
    }
    return rows;
  }

  /**
   * Finds a skill by name or creates it.
   * @param {string} skillName - Skill name.
   * @param {string} [category] - Optional category.
   * @returns {Promise<object>} Skill row.
   */
  async findOrCreate(skillName, category) {
    const existing = await this.db
      .select()
      .from(skills)
      .where(eq(skills.skill_name, skillName))
      .limit(1);
    if (existing[0]) {
      return existing[0];
    }
    const [created] = await this.db
      .insert(skills)
      .values({ skill_name: skillName, category })
      .returning();
    return created;
  }
}
