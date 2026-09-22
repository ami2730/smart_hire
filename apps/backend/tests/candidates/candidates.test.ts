import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma, disconnectDatabase } from '../../src/config/database';
import { Role } from '@prisma/client';

const app = createApp();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loginAs(email: string, password: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  return res.body.data.tokens.accessToken as string;
}

async function registerRecruiter(
  suffix: string
): Promise<{ token: string; userId: string }> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: `Recruiter ${suffix}`,
      email: `recruiter.${suffix}@candidate.test`,
      password: 'Password123!',
      role: Role.RECRUITER,
    });
  return {
    token: res.body.data.tokens.accessToken as string,
    userId: res.body.data.user.id as string,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Candidate Management API', () => {
  let token: string;
  let userId: string;
  let candidateId: string;
  let skillId: string;
  let educationId: string;
  let experienceId: string;

  beforeAll(async () => {
    const recruiter = await registerRecruiter(`main.${Date.now()}`);
    token = recruiter.token;
    userId = recruiter.userId;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => null);
    await disconnectDatabase();
  });

  // ── CREATE ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/candidates', () => {
    it('should create a candidate with skills, education, and experience (201)', async () => {
      const res = await request(app)
        .post('/api/v1/candidates')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Alice Nguyen',
          email: `alice.${Date.now()}@example.com`,
          phone: '+1-555-0100',
          location: 'San Francisco, CA',
          summary: 'Full-stack engineer with 5 years of experience.',
          skills: [
            { name: 'TypeScript', yearsOfExperience: 4, proficiencyLevel: 'ADVANCED' },
            { name: 'React', yearsOfExperience: 3, proficiencyLevel: 'INTERMEDIATE' },
          ],
          education: [
            {
              institution: 'UC Berkeley',
              degree: "Bachelor's",
              field: 'Computer Science',
              startDate: '2015-09-01',
              endDate: '2019-05-15',
            },
          ],
          experience: [
            {
              company: 'Acme Corp',
              jobTitle: 'Senior Engineer',
              description: 'Built microservices using Node.js.',
              startDate: '2019-07-01',
              years: 5,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const c = res.body.data.candidate;
      expect(c.name).toBe('Alice Nguyen');
      expect(c.skills).toHaveLength(2);
      expect(c.education).toHaveLength(1);
      expect(c.experience).toHaveLength(1);
      expect(c.skills.some((s: { name: string }) => s.name === 'TypeScript')).toBe(true);

      candidateId = c.id as string;
    });

    it('should return 409 for duplicate email', async () => {
      const res = await request(app)
        .post('/api/v1/candidates')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Alice Duplicate',
          email: (
            await request(app)
              .get(`/api/v1/candidates/${candidateId}`)
              .set('Authorization', `Bearer ${token}`)
          ).body.data.candidate.email,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT_ERROR');
    });

    it('should return 400 for missing name', async () => {
      const res = await request(app)
        .post('/api/v1/candidates')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'noemail@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).post('/api/v1/candidates').send({
        name: 'Ghost',
        email: 'ghost@example.com',
      });
      expect(res.status).toBe(401);
    });
  });

  // ── LIST ───────────────────────────────────────────────────────────────────

  describe('GET /api/v1/candidates', () => {
    it('should list candidates with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/candidates')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.candidates)).toBe(true);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(typeof res.body.pagination.total).toBe('number');
    });

    it('should search candidates by name', async () => {
      const res = await request(app)
        .get('/api/v1/candidates?search=Alice')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const candidates = res.body.data.candidates as Array<{ name: string }>;
      expect(candidates.some((c) => c.name.includes('Alice'))).toBe(true);
    });

    it('should filter candidates by skill', async () => {
      const res = await request(app)
        .get('/api/v1/candidates?skills=TypeScript')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.candidates.length).toBeGreaterThan(0);
    });

    it('should support pagination parameters', async () => {
      const res = await request(app)
        .get('/api/v1/candidates?page=1&limit=5')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.limit).toBe(5);
    });
  });

  // ── GET BY ID ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/candidates/:id', () => {
    it('should return the candidate with all relations', async () => {
      const res = await request(app)
        .get(`/api/v1/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const c = res.body.data.candidate;
      expect(c.id).toBe(candidateId);
      expect(Array.isArray(c.skills)).toBe(true);
      expect(Array.isArray(c.education)).toBe(true);
      expect(Array.isArray(c.experience)).toBe(true);
      expect(typeof c.applicationCount).toBe('number');
    });

    it('should return 404 for unknown ID', async () => {
      const res = await request(app)
        .get('/api/v1/candidates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/v1/candidates/not-a-uuid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── UPDATE ─────────────────────────────────────────────────────────────────

  describe('PATCH /api/v1/candidates/:id', () => {
    it('should update candidate profile fields', async () => {
      const res = await request(app)
        .patch(`/api/v1/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'Austin, TX', summary: 'Updated summary.' });

      expect(res.status).toBe(200);
      expect(res.body.data.candidate.location).toBe('Austin, TX');
      expect(res.body.data.candidate.summary).toBe('Updated summary.');
    });

    it('should return 404 when updating unknown candidate', async () => {
      const res = await request(app)
        .patch('/api/v1/candidates/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ location: 'Nowhere' });

      expect(res.status).toBe(404);
    });
  });

  // ── SKILLS ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/candidates/:id/skills', () => {
    it('should add a new skill to the candidate (201)', async () => {
      const res = await request(app)
        .post(`/api/v1/candidates/${candidateId}/skills`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'PostgreSQL', yearsOfExperience: 2, proficiencyLevel: 'INTERMEDIATE' });

      expect(res.status).toBe(201);
      expect(res.body.data.skill.name).toBe('PostgreSQL');
      expect(res.body.data.skill.yearsOfExperience).toBe(2);
      skillId = res.body.data.skill.skillId as string;
    });

    it('should upsert skill if it already exists for the candidate', async () => {
      // Adding the same skill again — should succeed (upsert)
      const res = await request(app)
        .post(`/api/v1/candidates/${candidateId}/skills`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'PostgreSQL', yearsOfExperience: 3, proficiencyLevel: 'ADVANCED' });

      expect(res.status).toBe(201);
      expect(res.body.data.skill.yearsOfExperience).toBe(3);
    });
  });

  describe('DELETE /api/v1/candidates/:id/skills/:skillId', () => {
    it('should remove a skill from the candidate', async () => {
      const res = await request(app)
        .delete(`/api/v1/candidates/${candidateId}/skills/${skillId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Skill removed successfully');
    });

    it('should return 404 for non-existent skill on candidate', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/candidates/${candidateId}/skills/00000000-0000-0000-0000-000000000000`
        )
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ── EDUCATION ──────────────────────────────────────────────────────────────

  describe('POST /api/v1/candidates/:id/education', () => {
    it('should add an education record (201)', async () => {
      const res = await request(app)
        .post(`/api/v1/candidates/${candidateId}/education`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          institution: 'MIT',
          degree: "Master's",
          field: 'Software Engineering',
          startDate: '2019-09-01',
          endDate: '2021-05-15',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.education.institution).toBe('MIT');
      educationId = res.body.data.education.id as string;
    });
  });

  describe('DELETE /api/v1/candidates/:id/education/:educationId', () => {
    it('should remove the education record', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/candidates/${candidateId}/education/${educationId}`
        )
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Education record removed successfully');
    });
  });

  // ── EXPERIENCE ─────────────────────────────────────────────────────────────

  describe('POST /api/v1/candidates/:id/experience', () => {
    it('should add an experience record (201)', async () => {
      const res = await request(app)
        .post(`/api/v1/candidates/${candidateId}/experience`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          company: 'Google',
          jobTitle: 'Staff Engineer',
          description: 'Led infra modernization.',
          startDate: '2021-06-01',
          years: 3,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.experience.company).toBe('Google');
      experienceId = res.body.data.experience.id as string;
    });
  });

  describe('DELETE /api/v1/candidates/:id/experience/:experienceId', () => {
    it('should remove the experience record', async () => {
      const res = await request(app)
        .delete(
          `/api/v1/candidates/${candidateId}/experience/${experienceId}`
        )
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe('Experience record removed successfully');
    });
  });

  // ── DELETE ─────────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/candidates/:id', () => {
    it('should delete the candidate', async () => {
      const delRes = await request(app)
        .delete(`/api/v1/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.message).toBe('Candidate deleted successfully');

      // Confirm gone
      const getRes = await request(app)
        .get(`/api/v1/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(404);
    });

    it('should return 404 when deleting an already-deleted candidate', async () => {
      const res = await request(app)
        .delete(`/api/v1/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
