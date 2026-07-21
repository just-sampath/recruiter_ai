import { sql } from 'drizzle-orm';
import { jobApplications } from '../../core/db/applications/schema.js';
import { candidates as candidatesTable } from '../../core/db/candidates/schema.js';

/**
 * Single source of filter semantics for structured (SQL) and hybrid (Qdrant) paths.
 * Company filter is always SQL ILIKE → candidate_id restriction (not Qdrant company match).
 */
export class FilterBuilder {
  /**
   * @param {object} filters - Normalized filter fields.
   */
  constructor(filters = {}) {
    this.filters = filters;
  }

  /**
   * Normalize extracted filters from QueryExtractor.
   * Pure: never throws on empty/partial input.
   * @param {object} [raw]
   * @returns {FilterBuilder}
   */
  static fromExtraction(raw = {}) {
    const filters = {
      locations: undefined,
      locations_norm: [],
      skills: undefined,
      experience_min: undefined,
      experience_max: undefined,
      notice_period_max: undefined,
      can_join_immediately: undefined,
      expected_salary_min: undefined,
      expected_salary_max: undefined,
      preferred_work_type: undefined,
      current_company: undefined,
      current_company_norm: undefined,
    };

    if (Array.isArray(raw.locations) && raw.locations.length) {
      const locs = raw.locations.map((l) => String(l).trim()).filter(Boolean);
      if (locs.length) {
        filters.locations = locs;
        filters.locations_norm = locs.map((l) => l.toLowerCase());
      }
    }

    if (Array.isArray(raw.skills) && raw.skills.length) {
      filters.skills = raw.skills.map((s) => String(s)).filter(Boolean);
      if (!filters.skills.length) filters.skills = undefined;
    }

    if (typeof raw.experience_min === 'number' && Number.isFinite(raw.experience_min)) {
      filters.experience_min = raw.experience_min;
    }
    if (typeof raw.experience_max === 'number' && Number.isFinite(raw.experience_max)) {
      filters.experience_max = raw.experience_max;
    }
    if (typeof raw.notice_period_max === 'number' && Number.isFinite(raw.notice_period_max)) {
      filters.notice_period_max = raw.notice_period_max;
    }
    // Only true is meaningful; false/omit → no clause
    if (raw.can_join_immediately === true) {
      filters.can_join_immediately = true;
    }
    if (typeof raw.expected_salary_min === 'number' && Number.isFinite(raw.expected_salary_min)) {
      filters.expected_salary_min = raw.expected_salary_min;
    }
    if (typeof raw.expected_salary_max === 'number' && Number.isFinite(raw.expected_salary_max)) {
      filters.expected_salary_max = raw.expected_salary_max;
    }
    if (raw.preferred_work_type != null && String(raw.preferred_work_type).trim()) {
      filters.preferred_work_type = String(raw.preferred_work_type).trim();
    }
    if (raw.current_company != null && String(raw.current_company).trim()) {
      const company = String(raw.current_company).trim();
      filters.current_company = company;
      filters.current_company_norm = company.toLowerCase();
    }

    return new FilterBuilder(filters);
  }

  /**
   * SQL WHERE clause fragments for structured search.
   * @param {number|null} [jobId]
   * @returns {{clauses: object[], needsSkillsJoin: boolean}}
   */
  toSqlClauses(jobId = null) {
    const f = this.filters;
    const clauses = [];
    let needsSkillsJoin = false;

    if (f.locations?.length) {
      clauses.push(
        sql`LOWER(c.current_location) IN (${sql.join(
          f.locations.map((l) => sql`LOWER(${l})`),
          sql`, `
        )})`
      );
    }

    if (typeof f.notice_period_max === 'number') {
      clauses.push(
        sql`(COALESCE(c.notice_period_days, 9999) <= ${f.notice_period_max} OR c.can_join_immediately = true)`
      );
    }

    if (f.can_join_immediately === true) {
      clauses.push(sql`c.can_join_immediately = true`);
    }

    if (typeof f.experience_min === 'number') {
      clauses.push(sql`c.total_experience_years >= ${f.experience_min}`);
    }

    if (typeof f.experience_max === 'number') {
      clauses.push(sql`c.total_experience_years <= ${f.experience_max}`);
    }

    if (typeof f.expected_salary_min === 'number') {
      clauses.push(sql`c.expected_salary_lpa >= ${f.expected_salary_min}`);
    }

    if (typeof f.expected_salary_max === 'number') {
      clauses.push(sql`c.expected_salary_lpa <= ${f.expected_salary_max}`);
    }

    if (f.preferred_work_type) {
      clauses.push(sql`c.preferred_work_type = ${f.preferred_work_type}`);
    }

    if (f.current_company) {
      clauses.push(sql`c.current_company ILIKE ${`%${f.current_company}%`}`);
    }

    if (f.skills?.length) {
      needsSkillsJoin = true;
      clauses.push(
        sql`s.skill_name IN (${sql.join(
          f.skills.map((s) => sql`${s}`),
          sql`, `
        )})`
      );
    }

    if (jobId) {
      clauses.push(sql`a.job_id = ${jobId}`);
    }

    return { clauses, needsSkillsJoin };
  }

  /**
   * Qdrant payload filter. Company is never a Qdrant company-field match —
   * pass intersected IDs via candidateIds (from resolveCandidateIdRestriction).
   * @param {object} [opts]
   * @param {number[]|null} [opts.candidateIds] - Allowed candidate IDs; `[-1]` sentinel = empty.
   * @returns {object|null}
   */
  toQdrantFilter({ candidateIds = null } = {}) {
    const f = this.filters;
    const must = [];

    if (f.skills?.length) {
      must.push({ key: 'skills', match: { any: f.skills } });
    }

    if (f.locations_norm?.length) {
      must.push({ key: 'current_location_norm', match: { any: f.locations_norm } });
    }

    // Notice: days ≤ N OR can_join true (nested min_should inside must)
    if (typeof f.notice_period_max === 'number') {
      must.push({
        min_should: {
          conditions: [
            { key: 'notice_period_days', range: { lte: f.notice_period_max } },
            { key: 'can_join_immediately', match: { value: true } },
          ],
          min_count: 1,
        },
      });
    }

    if (f.can_join_immediately === true) {
      must.push({ key: 'can_join_immediately', match: { value: true } });
    }

    if (typeof f.experience_min === 'number') {
      must.push({ key: 'total_experience_years', range: { gte: f.experience_min } });
    }

    if (typeof f.experience_max === 'number') {
      must.push({ key: 'total_experience_years', range: { lte: f.experience_max } });
    }

    if (typeof f.expected_salary_min === 'number') {
      must.push({ key: 'expected_salary_lpa', range: { gte: f.expected_salary_min } });
    }

    if (typeof f.expected_salary_max === 'number') {
      must.push({ key: 'expected_salary_lpa', range: { lte: f.expected_salary_max } });
    }

    if (f.preferred_work_type) {
      must.push({ key: 'preferred_work_type', match: { value: f.preferred_work_type } });
    }

    // Explicit company field match intentionally omitted (SQL prefilter → candidate_id).

    if (candidateIds != null) {
      if (!candidateIds.length || (candidateIds.length === 1 && candidateIds[0] === -1)) {
        must.push({ key: 'candidate_id', match: { value: -1 } });
      } else {
        must.push({ key: 'candidate_id', match: { any: candidateIds } });
      }
    }

    return must.length ? { must } : null;
  }

  /**
   * Resolve candidate_id restriction from company ILIKE and optional job applicants.
   * Intersects company IDs with job applicant IDs when both apply.
   * Empty intersection → `[-1]` sentinel. Company SQL error → fail closed `[-1]`.
   * No restrictions → `null`.
   *
   * @param {import('drizzle-orm').PostgresJsDatabase} db
   * @param {object|FilterBuilder} filters - Normalized filters or FilterBuilder instance.
   * @param {object} [opts]
   * @param {number|null} [opts.jobId]
   * @param {{ error?: Function, warn?: Function }} [opts.logger]
   * @returns {Promise<number[]|null>}
   */
  static async resolveCandidateIdRestriction(db, filters, { jobId = null, logger = null } = {}) {
    const f = filters instanceof FilterBuilder ? filters.filters : filters || {};

    let companyIds = null;
    let jobApplicantIds = null;

    if (f.current_company) {
      try {
        const rows = await db.execute(
          sql`SELECT candidate_id FROM ${candidatesTable}
              WHERE current_company ILIKE ${`%${f.current_company}%`}`
        );
        companyIds = rows.map((r) => Number(r.candidate_id));
      } catch (err) {
        logger?.error?.(
          { err, company: f.current_company },
          'FilterBuilder: company SQL prefilter failed (fail closed)'
        );
        return [-1];
      }
    }

    if (jobId) {
      const rows = await db.execute(
        sql`SELECT DISTINCT candidate_id FROM ${jobApplications} WHERE job_id = ${jobId}`
      );
      jobApplicantIds = rows.map((r) => Number(r.candidate_id));
    }

    if (companyIds === null && jobApplicantIds === null) {
      return null;
    }

    let result;
    if (companyIds !== null && jobApplicantIds !== null) {
      const jobSet = new Set(jobApplicantIds);
      result = companyIds.filter((id) => jobSet.has(id));
    } else {
      result = companyIds ?? jobApplicantIds;
    }

    if (!result.length) {
      return [-1];
    }
    return result;
  }
}
