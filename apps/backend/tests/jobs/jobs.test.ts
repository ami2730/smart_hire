import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma, disconnectDatabase } from '../../src/config/database';
import { Role, JobStatus } from '@prisma/client';

const app = createApp();

// ── Helpers ────────────────────────────────────────────────────────────────

async function loginUser(email: string, password: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  return res.body.data.tokens.accessToken as string;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Job Management API', () => {
  let recruiterToken: string;
  let adminToken: string;
  let recruiterUserId: string;
  let createdJobId: string;

  beforeAll(async () => {
    // Create a fresh recruiter for job tests
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Job Test Recruiter',
        email: `jobs.test.${Date.now()}@example.com`,
        password: 'Password123!',
        role: Role.RECRUITER,
      });

    recruiterToken = regRes.body.data.tokens.accessToken as string;
    recruiterUserId = regRes.body.data.user.id as string;

    adminToken = await loginUser('admin@smarthire.local', 'Password123!');
  });

  afterAll(async () => {
    // Clean up test jobs created by recruiter
    await prisma.job.deleteMany({ where: { recruiterId: recruiterUserId } });
    await prisma.user.delete({ where: { id: recruiterUserId } }).catch(() => null);
    await disconnectDatabase();
  });

  // ── CREATE ───────────────────────────────────────────────────────────────

  describe('POST /api/v1/jobs', () => {
    it('should create a job as DRAFT (201)', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          title: 'Senior TypeScript Engineer',
          description: 'Build scalable Node.js microservices with PostgreSQL.',
          minimumExperienceYears: 3,
          requiredSkills: ['TypeScript', 'Node.js', 'PostgreSQL'],
          educationRequirements: "Bachelor's in Computer Science",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.job.status).toBe(JobStatus.DRAFT);
      expect(res.body.data.job.title).toBe('Senior TypeScript Engineer');
      expect(res.body.data.job.requirements.requiredSkills).toContain('TypeScript');
      expect(res.body.data.job.recruiter.id).toBe(recruiterUserId);

      createdJobId = res.body.data.job.id as string;
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .send({ title: 'Unauthorized Job', description: 'Should be rejected.' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ description: 'Missing title field.' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── LIST ─────────────────────────────────────────────────────────────────

  describe('GET /api/v1/jobs', () => {
    it('should list jobs with pagination metadata', async () => {
      const res = await request(app)
        .get('/api/v1/jobs')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.jobs)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
    });

    it('should filter jobs by status', async () => {
      const res = await request(app)
        .get('/api/v1/jobs?status=DRAFT')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      const jobs = res.body.data.jobs as Array<{ status: string }>;
      jobs.forEach((job) => expect(job.status).toBe(JobStatus.DRAFT));
    });

    it('should search jobs by title', async () => {
      const res = await request(app)
        .get('/api/v1/jobs?search=TypeScript')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      const jobs = res.body.data.jobs as Array<{ title: string }>;
      expect(jobs.some((j) => j.title.toLowerCase().includes('typescript'))).toBe(true);
    });
  });

  // ── GET BY ID ────────────────────────────────────────────────────────────

  describe('GET /api/v1/jobs/:id', () => {
    it('should return the job by ID for its owner', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.job.id).toBe(createdJobId);
    });

    it('should return 404 for unknown job ID', async () => {
      const res = await request(app)
        .get('/api/v1/jobs/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid UUID format', async () => {
      const res = await request(app)
        .get('/api/v1/jobs/not-a-valid-uuid')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── UPDATE ───────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/jobs/:id', () => {
    it('should update the job title and skills', async () => {
      const res = await request(app)
        .patch(`/api/v1/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          title: 'Lead TypeScript Engineer',
          requiredSkills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.job.title).toBe('Lead TypeScript Engineer');
      expect(res.body.data.job.requirements.requiredSkills).toContain('Docker');
    });

    it('should return 403 when another recruiter tries to update', async () => {
      const anotherRecruiter = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Another Recruiter',
          email: `another.${Date.now()}@example.com`,
          password: 'Password123!',
          role: Role.RECRUITER,
        });
      const anotherToken = anotherRecruiter.body.data.tokens.accessToken as string;
      const anotherUserId = anotherRecruiter.body.data.user.id as string;

      const res = await request(app)
        .patch(`/api/v1/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({ title: 'Hijacked Title' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');

      // Cleanup
      await prisma.user.delete({ where: { id: anotherUserId } });
    });

    it('should allow ADMIN to update any job', async () => {
      const res = await request(app)
        .patch(`/api/v1/jobs/${createdJobId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Updated Title' });

      expect(res.status).toBe(200);
      expect(res.body.data.job.title).toBe('Admin Updated Title');
    });
  });

  // ── PUBLISH & CLOSE ──────────────────────────────────────────────────────

  describe('POST /api/v1/jobs/:id/publish and /close', () => {
    it('should publish a DRAFT job', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${createdJobId}/publish`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.job.status).toBe(JobStatus.PUBLISHED);
    });

    it('should close a PUBLISHED job', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${createdJobId}/close`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.job.status).toBe(JobStatus.CLOSED);
    });

    it('should reject publishing a job with no required skills', async () => {
      // Create a job with no skills
      const newJob = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          title: 'Empty Skills Job',
          description: 'This job has no required skills assigned yet.',
          requiredSkills: [],
        });

      const jobId = newJob.body.data.job.id as string;

      const res = await request(app)
        .post(`/api/v1/jobs/${jobId}/publish`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── DELETE ───────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/jobs/:id', () => {
    it('should delete an owned job', async () => {
      const createRes = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          title: 'Job To Delete',
          description: 'This job will be deleted in the test.',
          requiredSkills: ['Python'],
        });

      const toDeleteId = createRes.body.data.job.id as string;

      const delRes = await request(app)
        .delete(`/api/v1/jobs/${toDeleteId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.message).toBe('Job deleted successfully');

      // Verify gone
      const getRes = await request(app)
        .get(`/api/v1/jobs/${toDeleteId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(getRes.status).toBe(404);
    });
  });
});
