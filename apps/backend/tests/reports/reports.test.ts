import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma, disconnectDatabase } from '../../src/config/database';
import { Role, ApplicationStatus } from '@prisma/client';

const app = createApp();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerAndLogin(suffix: string, role: Role = Role.RECRUITER) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: `Report Tester ${suffix}`,
      email: `report.test.${suffix}@example.com`,
      password: 'Password123!',
      role,
    });
  return {
    token: res.body.data.tokens.accessToken as string,
    userId: res.body.data.user.id as string,
  };
}

async function createJob(token: string, title: string) {
  const res = await request(app)
    .post('/api/v1/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title,
      description: `Description for ${title}. Looking for engineers skilled in Node.js and PostgreSQL.`,
      minimumExperienceYears: 2,
      requiredSkills: ['Node.js', 'PostgreSQL'],
      educationRequirements: 'Bachelor in Computer Science',
    });

  const jobId = res.body.data.job.id as string;

  await request(app)
    .post(`/api/v1/jobs/${jobId}/publish`)
    .set('Authorization', `Bearer ${token}`);

  return jobId;
}

async function createCandidate(token: string, suffix: string, skill: string) {
  const res = await request(app)
    .post('/api/v1/candidates')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Candidate ${suffix}`,
      email: `report.cand.${suffix}@example.com`,
      summary: `Software developer experienced in ${skill}`,
    });

  const candidateId = res.body.data.candidate.id as string;

  await request(app)
    .post(`/api/v1/candidates/${candidateId}/skills`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: skill,
      yearsOfExperience: 3,
      proficiencyLevel: 'EXPERT',
    });

  return candidateId;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Reports & Analytics API (Phase 10)', () => {
  let recruiterToken: string;
  let recruiterId: string;
  let otherRecruiterToken: string;
  let otherRecruiterId: string;
  let jobId: string;
  let candidate1Id: string;
  let candidate2Id: string;
  let applicationId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const r1 = await registerAndLogin(`owner.${timestamp}`);
    recruiterToken = r1.token;
    recruiterId = r1.userId;

    const r2 = await registerAndLogin(`other.${timestamp}`);
    otherRecruiterToken = r2.token;
    otherRecruiterId = r2.userId;

    jobId = await createJob(recruiterToken, `Analytics Job ${timestamp}`);

    candidate1Id = await createCandidate(recruiterToken, `one.${timestamp}`, 'Node.js');
    candidate2Id = await createCandidate(recruiterToken, `two.${timestamp}`, 'Python');

    // Create applications
    const appRes = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ candidateId: candidate1Id, jobId });
    applicationId = appRes.body.data.application.id;

    await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ candidateId: candidate2Id, jobId });

    // Perform screening on first application
    await request(app)
      .post(`/api/v1/applications/${applicationId}/screen`)
      .set('Authorization', `Bearer ${recruiterToken}`);
  });

  afterAll(async () => {
    await prisma.application.deleteMany({
      where: { jobId },
    }).catch(() => null);

    await prisma.job.deleteMany({
      where: { id: jobId },
    }).catch(() => null);

    await prisma.candidate.deleteMany({
      where: { id: { in: [candidate1Id, candidate2Id] } },
    }).catch(() => null);

    await prisma.user.deleteMany({
      where: { id: { in: [recruiterId, otherRecruiterId] } },
    }).catch(() => null);

    await disconnectDatabase();
  });

  // ── GET /api/v1/reports/overview ────────────────────────────────────────────

  describe('GET /api/v1/reports/overview', () => {
    it('should return executive dashboard overview KPIs', async () => {
      const res = await request(app)
        .get('/api/v1/reports/overview')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.totalJobs).toBeGreaterThanOrEqual(1);
      expect(data.activeJobs).toBeGreaterThanOrEqual(1);
      expect(data.totalCandidates).toBeGreaterThanOrEqual(2);
      expect(data.totalApplications).toBeGreaterThanOrEqual(2);
      expect(data.totalScreenings).toBeGreaterThanOrEqual(1);
      expect(typeof data.averageMatchScore).toBe('number');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/v1/reports/overview');
      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/v1/reports/screening ───────────────────────────────────────────

  describe('GET /api/v1/reports/screening', () => {
    it('should return screening statistics and multi-criteria score averages', async () => {
      const res = await request(app)
        .get('/api/v1/reports/screening')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.totalEvaluations).toBeGreaterThanOrEqual(1);
      expect(data.averages).toBeDefined();
      expect(typeof data.averages.overallScore).toBe('number');
      expect(typeof data.averages.skillMatchScore).toBe('number');
      expect(typeof data.averages.experienceMatchScore).toBe('number');
      expect(typeof data.averages.educationMatchScore).toBe('number');
      expect(typeof data.averages.semanticSimilarityScore).toBe('number');
      expect(data.recommendations).toBeDefined();
      expect(Array.isArray(data.topMatchingSkills)).toBe(true);
      expect(Array.isArray(data.topMissingSkills)).toBe(true);
    });

    it('should filter screening report by jobId', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/screening?jobId=${jobId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.totalEvaluations).toBeGreaterThanOrEqual(1);
    });

    it('should return 403 when recruiter queries screening report for a job they do not own', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/screening?jobId=${jobId}`)
        .set('Authorization', `Bearer ${otherRecruiterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  // ── GET /api/v1/reports/jobs ────────────────────────────────────────────────

  describe('GET /api/v1/reports/jobs', () => {
    it('should return job statistics, status distribution, and screening completion rates', async () => {
      const res = await request(app)
        .get('/api/v1/reports/jobs')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.totalJobs).toBeGreaterThanOrEqual(1);
      expect(data.jobsByStatus).toBeDefined();
      expect(data.jobsByStatus.PUBLISHED).toBeGreaterThanOrEqual(1);
      expect(data.totalApplications).toBeGreaterThanOrEqual(2);
      expect(data.totalScreenedApplications).toBeGreaterThanOrEqual(1);
      expect(typeof data.screeningRate).toBe('number');
      expect(Array.isArray(data.jobs)).toBe(true);
    });
  });

  // ── GET /api/v1/reports/jobs/:id ────────────────────────────────────────────

  describe('GET /api/v1/reports/jobs/:id', () => {
    it('should return detailed pipeline funnel report for a single job posting', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/jobs/${jobId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.job.id).toBe(jobId);
      expect(data.metrics).toBeDefined();
      expect(data.metrics.totalApplications).toBe(2);
      expect(data.metrics.screenedApplications).toBe(1);
      expect(data.metrics.pipelineFunnel).toBeDefined();
      expect(Array.isArray(data.topCandidates)).toBe(true);
      expect(data.topCandidates.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 403 when another recruiter views report for this job', async () => {
      const res = await request(app)
        .get(`/api/v1/reports/jobs/${jobId}`)
        .set('Authorization', `Bearer ${otherRecruiterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should return 404 for non-existent job ID', async () => {
      const res = await request(app)
        .get('/api/v1/reports/jobs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ── GET /api/v1/reports/candidates ──────────────────────────────────────────

  describe('GET /api/v1/reports/candidates', () => {
    it('should return talent pool analytics and top candidate skills', async () => {
      const res = await request(app)
        .get('/api/v1/reports/candidates')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const data = res.body.data;
      expect(data.totalCandidates).toBeGreaterThanOrEqual(2);
      expect(typeof data.candidatesWithResumes).toBe('number');
      expect(typeof data.activeApplicants).toBe('number');
      expect(Array.isArray(data.topCandidateSkills)).toBe(true);
    });
  });
});
