import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma, disconnectDatabase } from '../../src/config/database';
import { Role } from '@prisma/client';

const app = createApp();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerAndLogin(suffix: string, role: Role = Role.RECRUITER) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: `Rank Tester ${suffix}`,
      email: `rank.test.${suffix}@example.com`,
      password: 'Password123!',
      role,
    });
  return {
    token: res.body.data.tokens.accessToken as string,
    userId: res.body.data.user.id as string,
  };
}

async function createAndPublishJob(token: string, title: string) {
  const res = await request(app)
    .post('/api/v1/jobs')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title,
      description: `Description for ${title}. Looking for Senior Backend Engineer with TypeScript and PostgreSQL.`,
      minimumExperienceYears: 3,
      requiredSkills: ['TypeScript', 'Node.js', 'PostgreSQL'],
      educationRequirements: 'Bachelor in Computer Science',
    });

  const jobId = res.body.data.job.id as string;

  await request(app)
    .post(`/api/v1/jobs/${jobId}/publish`)
    .set('Authorization', `Bearer ${token}`);

  return jobId;
}

async function createCandidateWithProfile(
  token: string,
  suffix: string,
  skills: string[],
  experienceYears: number,
  experienceRole: string
) {
  const res = await request(app)
    .post('/api/v1/candidates')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Candidate ${suffix}`,
      email: `rank.cand.${suffix}@example.com`,
      summary: `Software developer experienced in ${skills.join(', ')}`,
    });

  const candidateId = res.body.data.candidate.id as string;

  for (const skillName of skills) {
    await request(app)
      .post(`/api/v1/candidates/${candidateId}/skills`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: skillName,
        yearsOfExperience: experienceYears,
        proficiencyLevel: 'ADVANCED',
      });
  }

  await request(app)
    .post(`/api/v1/candidates/${candidateId}/education`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      institution: 'State University',
      degree: 'Bachelor in Computer Science',
      startDate: '2016-09-01T00:00:00.000Z',
    });

  await request(app)
    .post(`/api/v1/candidates/${candidateId}/experience`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      company: 'Tech Solutions',
      jobTitle: experienceRole,
      years: experienceYears,
      description: `Worked with ${skills.join(', ')}`,
      startDate: '2020-01-01T00:00:00.000Z',
    });

  return candidateId;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Candidate Ranking API (Phase 9)', () => {
  let recruiterToken: string;
  let recruiterId: string;
  let otherRecruiterToken: string;
  let otherRecruiterId: string;
  let jobId: string;
  let candStrongId: string;
  let candModerateId: string;
  let candLowId: string;

  beforeAll(async () => {
    const timestamp = Date.now();
    const r1 = await registerAndLogin(`owner.${timestamp}`);
    recruiterToken = r1.token;
    recruiterId = r1.userId;

    const r2 = await registerAndLogin(`other.${timestamp}`);
    otherRecruiterToken = r2.token;
    otherRecruiterId = r2.userId;

    jobId = await createAndPublishJob(recruiterToken, `Staff Backend Lead ${timestamp}`);

    // Candidate A: Strong Match (Has all 3 required skills, 5 years experience)
    candStrongId = await createCandidateWithProfile(
      recruiterToken,
      `strong.${timestamp}`,
      ['TypeScript', 'Node.js', 'PostgreSQL'],
      5,
      'Senior Backend Engineer'
    );

    // Candidate B: Moderate Match (Has 1 required skill, 2 years experience)
    candModerateId = await createCandidateWithProfile(
      recruiterToken,
      `mod.${timestamp}`,
      ['Node.js'],
      2,
      'Junior Backend Developer'
    );

    // Candidate C: Low Match (Different skill set, 1 year)
    candLowId = await createCandidateWithProfile(
      recruiterToken,
      `low.${timestamp}`,
      ['Photoshop', 'Figma'],
      1,
      'UI Designer'
    );

    // Submit applications for all 3 candidates
    await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ candidateId: candStrongId, jobId });

    await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ candidateId: candModerateId, jobId });

    await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ candidateId: candLowId, jobId });
  });

  afterAll(async () => {
    await prisma.application.deleteMany({
      where: { jobId },
    }).catch(() => null);

    await prisma.job.deleteMany({
      where: { id: jobId },
    }).catch(() => null);

    await prisma.candidate.deleteMany({
      where: { id: { in: [candStrongId, candModerateId, candLowId] } },
    }).catch(() => null);

    await prisma.user.deleteMany({
      where: { id: { in: [recruiterId, otherRecruiterId] } },
    }).catch(() => null);

    await disconnectDatabase();
  });

  // ── POST /api/v1/jobs/:id/rank (Trigger Batch Ranking) ──────────────────────

  describe('POST /api/v1/jobs/:id/rank', () => {
    it('should return 403 when another recruiter attempts to trigger batch ranking', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${jobId}/rank`)
        .set('Authorization', `Bearer ${otherRecruiterToken}`)
        .send({ force: true });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should trigger batch ranking and evaluate all candidates via ML service', async () => {
      const res = await request(app)
        .post(`/api/v1/jobs/${jobId}/rank`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ force: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rankings).toBeDefined();
      expect(res.body.data.rankings.length).toBe(3);

      const rankings = res.body.data.rankings;

      // Rank 1 should be the strong match candidate
      expect(rankings[0].candidateId).toBe(candStrongId);
      expect(rankings[0].rank).toBe(1);
      expect(rankings[0].matchScore).toBeGreaterThan(50);

      // Rank 3 should be the low match candidate
      expect(rankings[2].candidateId).toBe(candLowId);
      expect(rankings[2].rank).toBe(3);
      expect(rankings[2].matchScore).toBeLessThan(rankings[0].matchScore);
    });
  });

  // ── GET /api/v1/jobs/:id/rankings (Leaderboard & Queries) ────────────────────

  describe('GET /api/v1/jobs/:id/rankings', () => {
    it('should return the ranked leaderboard ordered by matchScore desc with sequential ranks', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${jobId}/rankings`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.job.id).toBe(jobId);
      expect(res.body.pagination).toBeDefined();

      const rankings = res.body.data.rankings;
      expect(rankings.length).toBe(3);

      // Verify sequential ranks
      expect(rankings[0].rank).toBe(1);
      expect(rankings[1].rank).toBe(2);
      expect(rankings[2].rank).toBe(3);

      // Verify scores are descending
      expect(rankings[0].matchScore).toBeGreaterThanOrEqual(rankings[1].matchScore);
      expect(rankings[1].matchScore).toBeGreaterThanOrEqual(rankings[2].matchScore);

      // Verify component details
      const top = rankings[0];
      expect(top.components).toBeDefined();
      expect(typeof top.components.skillMatch).toBe('number');
      expect(typeof top.components.experienceMatch).toBe('number');
      expect(typeof top.components.educationMatch).toBe('number');
      expect(typeof top.components.semanticSimilarity).toBe('number');
      expect(Array.isArray(top.matchingSkills)).toBe(true);
      expect(Array.isArray(top.missingSkills)).toBe(true);
      expect(top.explanation).toBeDefined();
    });

    it('should filter rankings by recommendation', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${jobId}/rankings?recommendation=LOW_MATCH`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      for (const cand of res.body.data.rankings) {
        expect(cand.recommendation).toBe('LOW_MATCH');
      }
    });

    it('should filter rankings by minScore', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${jobId}/rankings?minScore=50`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      for (const cand of res.body.data.rankings) {
        expect(cand.matchScore).toBeGreaterThanOrEqual(50);
      }
    });

    it('should filter rankings by skill', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${jobId}/rankings?skills=TypeScript`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      for (const cand of res.body.data.rankings) {
        const lowerSkills = cand.matchingSkills.map((s: string) => s.toLowerCase());
        expect(lowerSkills).toContain('typescript');
      }
    });

    it('should sort rankings by skillMatchScore asc', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${jobId}/rankings?sortBy=skillMatchScore&sortOrder=asc`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      const rankings = res.body.data.rankings;
      expect(rankings[0].components.skillMatch).toBeLessThanOrEqual(
        rankings[rankings.length - 1].components.skillMatch
      );
    });

    it('should return 403 when another recruiter attempts to view rankings', async () => {
      const res = await request(app)
        .get(`/api/v1/jobs/${jobId}/rankings`)
        .set('Authorization', `Bearer ${otherRecruiterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should return 404 for non-existent job ID', async () => {
      const res = await request(app)
        .get('/api/v1/jobs/00000000-0000-0000-0000-000000000000/rankings')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ── Dedicated /api/v1/ranking/jobs/:id Route ────────────────────────────────

  describe('GET & POST /api/v1/ranking/jobs/:id', () => {
    it('should return identical rankings via the /api/v1/ranking/jobs/:id route', async () => {
      const res = await request(app)
        .get(`/api/v1/ranking/jobs/${jobId}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.job.id).toBe(jobId);
      expect(res.body.data.rankings.length).toBe(3);
    });

    it('should trigger batch ranking via POST /api/v1/ranking/jobs/:id', async () => {
      const res = await request(app)
        .post(`/api/v1/ranking/jobs/${jobId}`)
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({ force: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rankings.length).toBe(3);
    });
  });
});
