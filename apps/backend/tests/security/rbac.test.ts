import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma, disconnectDatabase } from '../../src/config/database';
import { Role, JobStatus, ApplicationStatus } from '@prisma/client';

const app = createApp();

describe('Comprehensive RBAC & Domain Ownership Tests (Phase 3)', () => {
  const timestamp = Date.now();

  let adminToken: string;
  let adminId: string;

  let recruiter1Token: string;
  let recruiter1Id: string;

  let recruiter2Token: string;
  let recruiter2Id: string;

  let applicant1Token: string;
  let applicant1Id: string;
  let applicant1CandidateId: string;

  let applicant2Token: string;
  let applicant2Id: string;

  let job1Id: string;
  let job2Id: string;
  let app1Id: string;

  beforeAll(async () => {
    // 1. Create Admin
    const adminRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: `Admin ${timestamp}`,
        email: `admin.${timestamp}@example.com`,
        password: 'Password123!',
        role: Role.ADMIN,
      });
    adminToken = adminRes.body.data.tokens.accessToken;
    adminId = adminRes.body.data.user.id;

    // 2. Create Recruiter 1
    const r1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: `Recruiter One ${timestamp}`,
        email: `recruiter1.${timestamp}@example.com`,
        password: 'Password123!',
        role: Role.RECRUITER,
      });
    recruiter1Token = r1Res.body.data.tokens.accessToken;
    recruiter1Id = r1Res.body.data.user.id;

    // 3. Create Recruiter 2
    const r2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: `Recruiter Two ${timestamp}`,
        email: `recruiter2.${timestamp}@example.com`,
        password: 'Password123!',
        role: Role.RECRUITER,
      });
    recruiter2Token = r2Res.body.data.tokens.accessToken;
    recruiter2Id = r2Res.body.data.user.id;

    // 4. Create Applicant 1
    const a1Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: `Applicant One ${timestamp}`,
        email: `applicant1.${timestamp}@example.com`,
        password: 'Password123!',
        role: Role.APPLICANT,
      });
    applicant1Token = a1Res.body.data.tokens.accessToken;
    applicant1Id = a1Res.body.data.user.id;

    const cand1 = await prisma.candidate.findUnique({
      where: { userId: applicant1Id },
    });
    applicant1CandidateId = cand1?.id ?? '';

    // 5. Create Applicant 2
    const a2Res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: `Applicant Two ${timestamp}`,
        email: `applicant2.${timestamp}@example.com`,
        password: 'Password123!',
        role: Role.APPLICANT,
      });
    applicant2Token = a2Res.body.data.tokens.accessToken;
    applicant2Id = a2Res.body.data.user.id;

    // 6. Recruiter 1 creates Job 1
    const j1Res = await request(app)
      .post('/api/v1/recruiter/jobs')
      .set('Authorization', `Bearer ${recruiter1Token}`)
      .send({
        title: `Full Stack Engineer ${timestamp}`,
        description: 'TypeScript, React, Node.js, and PostgreSQL development.',
        requiredSkills: ['TypeScript', 'Node.js', 'React'],
        preferredSkills: ['Docker', 'AWS'],
        minimumExperienceYears: 3,
        location: 'Remote',
        employmentType: 'Full-time',
      });
    job1Id = j1Res.body.data.job.id;

    // Publish Job 1
    await request(app)
      .post(`/api/v1/recruiter/jobs/${job1Id}/publish`)
      .set('Authorization', `Bearer ${recruiter1Token}`);

    // 7. Recruiter 2 creates Job 2
    const j2Res = await request(app)
      .post('/api/v1/recruiter/jobs')
      .set('Authorization', `Bearer ${recruiter2Token}`)
      .send({
        title: `DevOps Engineer ${timestamp}`,
        description: 'Kubernetes, Terraform, CI/CD pipelines.',
        requiredSkills: ['Kubernetes', 'Docker'],
        minimumExperienceYears: 4,
      });
    job2Id = j2Res.body.data.job.id;
  });

  afterAll(async () => {
    const userIds = [adminId, recruiter1Id, recruiter2Id, applicant1Id, applicant2Id].filter(Boolean);

    await prisma.screeningResult.deleteMany({
      where: { application: { jobId: { in: [job1Id, job2Id] } } },
    }).catch(() => null);

    await prisma.application.deleteMany({
      where: { jobId: { in: [job1Id, job2Id] } },
    }).catch(() => null);

    await prisma.jobSkill.deleteMany({
      where: { jobId: { in: [job1Id, job2Id] } },
    }).catch(() => null);

    await prisma.jobRequirement.deleteMany({
      where: { jobId: { in: [job1Id, job2Id] } },
    }).catch(() => null);

    await prisma.job.deleteMany({
      where: { id: { in: [job1Id, job2Id] } },
    }).catch(() => null);

    await prisma.candidateSkill.deleteMany({
      where: { candidate: { userId: { in: userIds } } },
    }).catch(() => null);

    await prisma.resume.deleteMany({
      where: { candidate: { userId: { in: userIds } } },
    }).catch(() => null);

    await prisma.candidate.deleteMany({
      where: { userId: { in: userIds } },
    }).catch(() => null);

    await prisma.auditLog.deleteMany({
      where: { userId: { in: userIds } },
    }).catch(() => null);

    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    }).catch(() => null);

    await disconnectDatabase();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Role Access & Boundary Enforcement
  // ─────────────────────────────────────────────────────────────────────────
  describe('Role-Based Access Boundaries', () => {
    it('Applicant cannot access recruiter endpoints (403)', async () => {
      const res = await request(app)
        .get('/api/v1/recruiter/jobs')
        .set('Authorization', `Bearer ${applicant1Token}`);

      expect(res.status).toBe(403);
    });

    it('Applicant cannot access admin endpoints (403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${applicant1Token}`);

      expect(res.status).toBe(403);
    });

    it('Recruiter cannot access admin endpoints (403)', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${recruiter1Token}`);

      expect(res.status).toBe(403);
    });

    it('Unauthenticated requests are rejected with 401', async () => {
      const res = await request(app).get('/api/v1/applicant/profile');
      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Ownership Enforcement (Multi-tenant Recruiter Isolation)
  // ─────────────────────────────────────────────────────────────────────────
  describe('Recruiter Job & Application Ownership Isolation', () => {
    it('Recruiter 2 cannot update Recruiter 1 job (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/recruiter/jobs/${job1Id}`)
        .set('Authorization', `Bearer ${recruiter2Token}`)
        .send({ title: 'Hacked Title' });

      expect(res.status).toBe(403);
    });

    it('Recruiter 2 cannot delete Recruiter 1 job (403)', async () => {
      const res = await request(app)
        .delete(`/api/v1/recruiter/jobs/${job1Id}`)
        .set('Authorization', `Bearer ${recruiter2Token}`);

      expect(res.status).toBe(403);
    });

    it('Recruiter 2 cannot close Recruiter 1 job (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/recruiter/jobs/${job1Id}/close`)
        .set('Authorization', `Bearer ${recruiter2Token}`);

      expect(res.status).toBe(403);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Applicant Portal & Application Flow
  // ─────────────────────────────────────────────────────────────────────────
  describe('Applicant Application Flow & Constraints', () => {
    it('Applicant 1 can view profile and update details', async () => {
      const getRes = await request(app)
        .get('/api/v1/applicant/profile')
        .set('Authorization', `Bearer ${applicant1Token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.profile.email).toBe(`applicant1.${timestamp}@example.com`);

      const updateRes = await request(app)
        .patch('/api/v1/applicant/profile')
        .set('Authorization', `Bearer ${applicant1Token}`)
        .send({ location: 'San Francisco, CA', phone: '+1-555-0199' });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.profile.location).toBe('San Francisco, CA');
    });

    it('Applicant 1 applies for Job 1 with registered source', async () => {
      const res = await request(app)
        .post('/api/v1/applicant/applications')
        .set('Authorization', `Bearer ${applicant1Token}`)
        .send({
          jobId: job1Id,
          coverLetter: 'I am excited about this Full Stack role!',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.application.jobId).toBe(job1Id);
      expect(res.body.data.application.source).toBe('REGISTERED');
      expect(res.body.data.application.status).toBe(ApplicationStatus.SUBMITTED);
      app1Id = res.body.data.application.id;
    });

    it('Applicant 1 cannot apply twice for the same job (duplicate prevention 409)', async () => {
      const res = await request(app)
        .post('/api/v1/applicant/applications')
        .set('Authorization', `Bearer ${applicant1Token}`)
        .send({
          jobId: job1Id,
          coverLetter: 'Duplicate attempt',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.message).toBe('You have already applied for this position.');
    });

    it('Applicant 2 cannot view Applicant 1 application (403 forbidden isolation)', async () => {
      const res = await request(app)
        .get(`/api/v1/applicant/applications/${app1Id}`)
        .set('Authorization', `Bearer ${applicant2Token}`);

      expect(res.status).toBe(403);
    });

    it('Recruiter 2 cannot view applications for Recruiter 1 job', async () => {
      const res = await request(app)
        .get(`/api/v1/recruiter/applications/${app1Id}`)
        .set('Authorization', `Bearer ${recruiter2Token}`);

      expect(res.status).toBe(403);
    });

    it('Recruiter 1 can view the application for their job', async () => {
      const res = await request(app)
        .get(`/api/v1/recruiter/applications/${app1Id}`)
        .set('Authorization', `Bearer ${recruiter1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.application.id).toBe(app1Id);
    });

    it('Applicant 1 can withdraw their application', async () => {
      const res = await request(app)
        .post(`/api/v1/applicant/applications/${app1Id}/withdraw`)
        .set('Authorization', `Bearer ${applicant1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.application.status).toBe(ApplicationStatus.WITHDRAWN);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Admin Portal Capabilities
  // ─────────────────────────────────────────────────────────────────────────
  describe('Admin Portal Capabilities', () => {
    it('Admin can list platform users and filter by role', async () => {
      const res = await request(app)
        .get('/api/v1/admin/users?role=RECRUITER')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.users)).toBe(true);
    });

    it('Admin can toggle user active status', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${applicant2Id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.data.user.isActive).toBe(false);
    });

    it('Admin can view system overview metrics', async () => {
      const res = await request(app)
        .get('/api/v1/admin/reports')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.overview).toBeDefined();
      expect(res.body.data.overview.totalUsers).toBeGreaterThan(0);
    });
  });
});
