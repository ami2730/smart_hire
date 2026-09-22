import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma, disconnectDatabase } from '../../src/config/database';
import { Role, JobStatus, ApplicationStatus } from '@prisma/client';

const app = createApp();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerAndLogin(suffix: string, role: Role = Role.RECRUITER) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: `App Tester ${suffix}`,
      email: `app.test.${suffix}@example.com`,
      password: 'Password123!',
      role,
    });
  return {
    token: res.body.data.tokens.accessToken as string,
    userId: res.body.data.user.id as string,
  };
}

async function createJob(token: string, title: string, status: JobStatus = JobStatus.PUBLISHED) {
  const res = await request(app)
    .post('/api/v1/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title,
      description: `Description for ${title}`,
      minimumExperienceYears: 2,
      requiredSkills: ['TypeScript', 'Node.js', 'PostgreSQL'],
      educationRequirements: 'Bachelor in Computer Science',
    });

  const jobId = res.body.data.job.id as string;

  if (status === JobStatus.PUBLISHED) {
    await request(app)
      .post(`/api/v1/jobs/${jobId}/publish`)
      .set('Authorization', `Bearer ${token}`);
  }

  return jobId;
}

async function createCandidate(token: string, suffix: string) {
  const res = await request(app)
    .post('/api/v1/candidates')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Candidate ${suffix}`,
      email: `cand.${suffix}@example.com`,
      summary: 'Backend software developer skilled in Node.js and TypeScript',
    });

  const candidateId = res.body.data.candidate.id as string;

  // Add a skill
  await request(app)
    .post(`/api/v1/candidates/${candidateId}/skills`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'TypeScript',
      yearsOfExperience: 3,
      proficiencyLevel: 'EXPERT',
    });

  // Add education
  await request(app)
    .post(`/api/v1/candidates/${candidateId}/education`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      institution: 'Tech University',
      degree: 'Bachelor in Computer Science',
      startDate: '2018-09-01T00:00:00.000Z',
    });

  // Add experience
  await request(app)
    .post(`/api/v1/candidates/${candidateId}/experience`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      company: 'Acme Corp',
      jobTitle: 'Backend Developer',
      years: 3,
      description: 'Building REST APIs with TypeScript and PostgreSQL',
      startDate: '2021-01-01T00:00:00.000Z',
    });

  return candidateId;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Application Management & AI Screening API', () => {
  let recruiterToken: string;
  let recruiterId: string;
  let otherRecruiterToken: string;
  let otherRecruiterId: string;
  let publishedJobId: string;
  let draftJobId: string;
  let candidateId: string;
  let candidate2Id: string;
  let createdApplicationId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const r1 = await registerAndLogin(`recruiter1.${timestamp}`);
    recruiterToken = r1.token;
    recruiterId = r1.userId;

    const r2 = await registerAndLogin(`recruiter2.${timestamp}`);
    otherRecruiterToken = r2.token;
    otherRecruiterId = r2.userId;

    publishedJobId = await createJob(recruiterToken, `Backend Engineer ${timestamp}`, JobStatus.PUBLISHED);
    draftJobId = await createJob(recruiterToken, `Draft Job ${timestamp}`, JobStatus.DRAFT);

    candidateId = await createCandidate(recruiterToken, `one.${timestamp}`);
    candidate2Id = await createCandidate(recruiterToken, `two.${timestamp}`);
  });

  afterAll(async () => {
    // Clean up created entities
    await prisma.application.deleteMany({
      where: {
        OR: [
          { candidateId },
          { candidateId: candidate2Id },
          { jobId: publishedJobId },
          { jobId: draftJobId },
        ],
      },
    }).catch(() => null);

    await prisma.job.deleteMany({
      where: { id: { in: [publishedJobId, draftJobId] } },
    }).catch(() => null);

    await prisma.candidate.deleteMany({
      where: { id: { in: [candidateId, candidate2Id] } },
    }).catch(() => null);

    await prisma.user.deleteMany({
      where: { id: { in: [recruiterId, otherRecruiterId] } },
    }).catch(() => null);

    await disconnectDatabase();
  });

  // ── POST /api/v1/applications ───────────────────────────────────────────────

  describe('POST /api/v1/applications', () => {
    it('should submit an application for a published job and return 201', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId,
          jobId: publishedJobId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.application).toBeDefined();
      const appData = res.body.data.application;
      expect([ApplicationStatus.SUBMITTED, ApplicationStatus.APPLIED]).toContain(appData.status);

      createdApplicationId = appData.id as string;
    });

    it('should return 400 when applying to a DRAFT job', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: candidate2Id,
          jobId: draftJobId,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 when candidate has already applied to the same job', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId,
          jobId: publishedJobId,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT_ERROR');
    });

    it('should return 404 when candidate does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: '00000000-0000-0000-0000-000000000000',
          jobId: publishedJobId,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 404 when job does not exist', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          candidateId: candidate2Id,
          jobId: '00000000-0000-0000-0000-000000000000',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .send({
          candidateId,
          jobId: publishedJobId,
        });

      expect(res.status).toBe(401);
    });
  });

  // ── GET /api/v1/applications ────────────────────────────────────────────────

  describe('GET /api/v1/applications', () => {
    it('should list applications with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/applications')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.applications)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
    });

    it('should filter applications by jobId', async () => {
      const res = await request(app)
        .get(`/api/v1/applications?jobId=${publishedJobId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.applications.length).toBeGreaterThanOrEqual(1);
      for (const a of res.body.data.applications) {
        expect(a.job.id).toBe(publishedJobId);
      }
    });

    it('should filter applications by candidateId', async () => {
      const res = await request(app)
        .get(`/api/v1/applications?candidateId=${candidateId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.applications.length).toBeGreaterThanOrEqual(1);
      for (const a of res.body.data.applications) {
        expect(a.candidate.id).toBe(candidateId);
      }
    });

    it('should filter applications by status', async () => {
      const res = await request(app)
        .get('/api/v1/applications?status=APPLIED')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      for (const a of res.body.data.applications) {
        expect(a.status).toBe('APPLIED');
      }
    });
  });

  // ── GET /api/v1/applications/:id ────────────────────────────────────────────

  describe('GET /api/v1/applications/:id', () => {
    it('should return application details by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${createdApplicationId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.application.id).toBe(createdApplicationId);
      expect(res.body.data.application.candidate).toBeDefined();
      expect(res.body.data.application.job).toBeDefined();
    });

    it('should return 404 for non-existent application', async () => {
      const res = await request(app)
        .get('/api/v1/applications/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ── PATCH /api/v1/applications/:id/status ───────────────────────────────────

  describe('PATCH /api/v1/applications/:id/status', () => {
    it('should update application status to REVIEWED', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${createdApplicationId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: ApplicationStatus.REVIEWED });

      expect(res.status).toBe(200);
      expect(res.body.data.application.status).toBe(ApplicationStatus.REVIEWED);
    });

    it('should return 403 when another recruiter attempts to update status', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${createdApplicationId}/status`)
        .set('Authorization', `Bearer ${otherRecruiterToken}`)
        .send({ status: ApplicationStatus.SHORTLISTED });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should return 400 for invalid status value', async () => {
      const res = await request(app)
        .patch(`/api/v1/applications/${createdApplicationId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ status: 'INVALID_STATUS' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── POST /api/v1/applications/:id/screen (AI Screening) ─────────────────────

  describe('POST /api/v1/applications/:id/screen', () => {
    it('should return 403 if another recruiter attempts to screen the application', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${createdApplicationId}/screen`)
        .set('Authorization', `Bearer ${otherRecruiterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should evaluate candidate with ML service and persist screening result', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${createdApplicationId}/screen`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.screeningResult).toBeDefined();

      const sr = res.body.data.screeningResult;
      expect(typeof sr.overallScore).toBe('number');
      expect(sr.overallScore).toBeGreaterThanOrEqual(0);
      expect(sr.overallScore).toBeLessThanOrEqual(100);
      expect(['STRONG_MATCH', 'GOOD_MATCH', 'MODERATE_MATCH', 'LOW_MATCH']).toContain(
        sr.recommendation
      );
      expect(Array.isArray(sr.matchingSkills)).toBe(true);
      expect(sr.explanation).toBeDefined();

      // Application status should be transitioned to SCREENED
      expect(res.body.data.application.status).toBe(ApplicationStatus.SCREENED);
    });

    it('should return existing screening result when already screened without force flag', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${createdApplicationId}/screen`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('already screened');
      expect(res.body.data.screeningResult).toBeDefined();
    });

    it('should re-screen when force=true is provided', async () => {
      const res = await request(app)
        .post(`/api/v1/applications/${createdApplicationId}/screen?force=true`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.screeningResult).toBeDefined();
      expect(res.body.data.application.status).toBe(ApplicationStatus.SCREENED);
    });
  });

  // ── GET /api/v1/applications/:id/screening ──────────────────────────────────

  describe('GET /api/v1/applications/:id/screening', () => {
    it('should return all screening evaluations for an application', async () => {
      const res = await request(app)
        .get(`/api/v1/applications/${createdApplicationId}/screening`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.screeningResults)).toBe(true);
      expect(res.body.data.screeningResults.length).toBeGreaterThanOrEqual(1);
    });

    it('should return 404 for unknown application ID', async () => {
      const res = await request(app)
        .get('/api/v1/applications/00000000-0000-0000-0000-000000000000/screening')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(404);
    });
  });
});
