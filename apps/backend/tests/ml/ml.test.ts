import { describe, it, expect } from 'vitest';
import { MLService, mlService } from '../../src/services/ml.service';
import { MLServiceError } from '../../src/utils/errors';

const MINIMAL_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n' +
    'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n' +
    '0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\n' +
    'startxref\n190\n%%EOF'
);

describe('ML Integration Service (ml.service.ts)', () => {
  // ── Health Check ────────────────────────────────────────────────────────────

  describe('healthCheck', () => {
    it('should connect to the Python FastAPI service and return health status', async () => {
      const health = await mlService.healthCheck();

      expect(health).toBeDefined();
      expect(health.status).toBe('ok');
      expect(health.service).toBe('smarthire-ml-service');
      expect(typeof health.version).toBe('string');
    });
  });

  // ── Resume Text Extraction ──────────────────────────────────────────────────

  describe('extractResume', () => {
    it('should extract document metadata from a PDF buffer', async () => {
      const result = await mlService.extractResume(MINIMAL_PDF, 'minimal.pdf', 'application/pdf');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.document_type).toBe('pdf');
      expect(result.page_count).toBe(1);
      expect(typeof result.text).toBe('string');
    });
  });

  // ── Candidate Resume Analysis ───────────────────────────────────────────────

  describe('analyzeResume', () => {
    it('should analyze a resume buffer and return structured candidate profile', async () => {
      const result = await mlService.analyzeResume(MINIMAL_PDF, 'sample.pdf', 'application/pdf');

      expect(result).toBeDefined();
      expect(result.candidate_profile).toBeDefined();
      const profile = result.candidate_profile;
      expect(Array.isArray(profile.skills)).toBe(true);
      expect(Array.isArray(profile.education)).toBe(true);
      expect(Array.isArray(profile.experience)).toBe(true);
      expect(Array.isArray(profile.job_titles)).toBe(true);
      expect(typeof profile.sections).toBe('object');
      expect(typeof profile.raw_text).toBe('string');
      expect(typeof profile.processed_text).toBe('string');
    });
  });

  // ── Job Requirement Analysis ────────────────────────────────────────────────

  describe('analyzeJob', () => {
    it('should analyze job description and extract canonical skills and profile', async () => {
      const result = await mlService.analyzeJob({
        job_title: 'Senior Backend Engineer',
        description: 'Looking for a Senior Backend Engineer proficient in TypeScript, Node.js, and PostgreSQL.',
        required_skills: ['TypeScript', 'Node.js', 'PostgreSQL'],
        education: ['Bachelor in Computer Science'],
        minimum_experience_years: 3.0,
      });

      expect(result).toBeDefined();
      expect(result.job_profile).toBeDefined();
      const profile = result.job_profile;
      expect(profile.job_title).toBe('Senior Backend Engineer');
      expect(profile.skills).toEqual(
        expect.arrayContaining(['TypeScript', 'Node.js', 'PostgreSQL'])
      );
      expect(profile.education).toContain('Bachelor in Computer Science');
      expect(profile.experience_requirements.minimum_years).toBe(3);
      expect(typeof profile.processed_text).toBe('string');
    });
  });

  // ── Candidate Evaluation / Screening ────────────────────────────────────────

  describe('evaluateCandidate', () => {
    it('should evaluate a candidate against job requirements and return scores and explanation', async () => {
      const result = await mlService.evaluateCandidate({
        job: {
          title: 'Full Stack Engineer',
          description: 'Need full stack developer experienced in React, TypeScript, and Node.js.',
          required_skills: ['React', 'TypeScript', 'Node.js'],
          education_requirements: ['Bachelor Degree'],
          minimum_experience_years: 2.0,
        },
        candidate: {
          id: 'cand-eval-test-1',
          resume_text: 'Experienced Full Stack Engineer with 4 years in React, TypeScript, and Node.js.',
          skills: ['React', 'TypeScript', 'Node.js'],
          experience: ['4 years full stack development at Tech Co'],
          education: ['Bachelor in Computer Science'],
        },
      });

      expect(result).toBeDefined();
      expect(result.candidate_id).toBe('cand-eval-test-1');
      expect(result.match_score).toBeGreaterThan(70);
      expect(['strong_match', 'good_match', 'moderate_match', 'low_match']).toContain(
        result.recommendation
      );
      expect(result.components).toBeDefined();
      expect(typeof result.components.skill_match).toBe('number');
      expect(typeof result.components.experience_match).toBe('number');
      expect(typeof result.components.education_match).toBe('number');
      expect(typeof result.components.semantic_similarity).toBe('number');
      expect(result.matching_skills.length).toBeGreaterThan(0);
      expect(result.explanation).toBeDefined();
      expect(typeof result.explanation.summary_text).toBe('string');
      expect(result.explanation.summary_text.length).toBeGreaterThan(10);
    });

    it('should correctly identify missing skills for low match candidate', async () => {
      const result = await mlService.evaluateCandidate({
        job: {
          title: 'DevOps Specialist',
          description: 'Need Kubernetes, Terraform, and AWS specialist.',
          required_skills: ['Kubernetes', 'Terraform', 'AWS'],
          minimum_experience_years: 5.0,
        },
        candidate: {
          id: 'cand-eval-test-2',
          resume_text: 'Junior Graphic Designer proficient in Photoshop and Figma.',
          skills: ['Photoshop', 'Figma'],
          experience: ['1 year graphic design'],
        },
      });

      expect(result).toBeDefined();
      expect(result.match_score).toBeLessThan(40);
      expect(['low_match', 'moderate_match']).toContain(result.recommendation);
      expect(result.missing_skills.length).toBeGreaterThan(0);
    });
  });

  // ── Candidate Batch Ranking ─────────────────────────────────────────────────

  describe('rankCandidates', () => {
    it('should rank multiple candidates in descending order of match score', async () => {
      const result = await mlService.rankCandidates({
        job_id: 'job-rank-test-1',
        job: {
          title: 'Node.js Backend Developer',
          description: 'Looking for a skilled Node.js and PostgreSQL backend engineer.',
          required_skills: ['Node.js', 'PostgreSQL'],
          minimum_experience_years: 2.0,
        },
        candidates: [
          {
            id: 'cand-low',
            resume_text: 'Junior marketing specialist with social media experience',
            skills: ['Social Media', 'Content Writing'],
            experience: ['6 months internship'],
          },
          {
            id: 'cand-high',
            resume_text: 'Senior Node.js developer with 6 years experience building PostgreSQL microservices',
            skills: ['Node.js', 'PostgreSQL'],
            experience: ['6 years senior backend engineer'],
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.job_id).toBe('job-rank-test-1');
      expect(result.candidates).toHaveLength(2);

      // Best candidate should be ranked #1 with higher score
      expect(result.candidates[0].candidate_id).toBe('cand-high');
      expect(result.candidates[0].rank).toBe(1);
      expect(result.candidates[1].candidate_id).toBe('cand-low');
      expect(result.candidates[1].rank).toBe(2);
      expect(result.candidates[0].score).toBeGreaterThan(result.candidates[1].score);
    });
  });

  // ── Resilience & Error Handling ─────────────────────────────────────────────

  describe('Error handling and resilience', () => {
    it('should throw MLServiceError with status details when service returns 4xx', async () => {
      // Empty job_title and description are rejected by Pydantic validator
      await expect(
        mlService.analyzeJob({
          job_title: '',
          description: '',
        })
      ).rejects.toThrow(MLServiceError);
    });

    it('should throw MLServiceError with descriptive message when ML service is unreachable', async () => {
      const unreachableService = new MLService('http://127.0.0.1:59999', 2000);

      await expect(unreachableService.healthCheck()).rejects.toThrow(MLServiceError);
    });

    it('should throw MLServiceError on timeout', async () => {
      // Service configured with an ultra-short 1ms timeout to trigger timeout error
      const timeoutService = new MLService(undefined, 1);

      await expect(
        timeoutService.analyzeJob({
          job_title: 'Engineer',
          description: 'Engineer description',
        })
      ).rejects.toThrow(MLServiceError);
    });
  });
});
