import Fuse from 'fuse.js';

/**
 * Lightweight Fuse.js wrapper for fuzzy skill matching.
 */
export class FuzzyMatcher {
  constructor() {
    this.fuse = null;
  }

  /**
   * Updates the Fuse corpus with available skills.
   * @param {Array<{skill_name: string}>} skills - Skill objects from DB.
   */
  setCorpus(skills = []) {
    this.fuse = new Fuse(skills, {
      keys: ['skill_name'],
      threshold: 0.4,
      includeScore: true,
    });
  }

  /**
   * Finds the closest skill match.
   * @param {string} term - User-provided skill text.
   * @returns {{skill_name: string, score: number}|null} Best match or null.
   */
  findBest(term) {
    if (!this.fuse || !term) {
      return null;
    }
    const [best] = this.fuse.search(term);
    if (!best) {
      return null;
    }
    return { skill_name: best.item.skill_name, score: best.score ?? 0 };
  }
}
