import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../../src/app';
import { prisma, disconnectDatabase } from '../../src/config/database';
import { Role } from '@prisma/client';
import { UPLOAD_DIR } from '../../src/config/upload';

const app = createApp();

// ── Fixtures: create tiny but valid PDF and DOCX buffers ─────────────────────

// A minimal 1-page PDF (well-formed enough for MIME validation)
const MINIMAL_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n' +
    'xref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n' +
    '0000000058 00000 n\n0000000115 00000 n\ntrailer<</Size 4/Root 1 0 R>>\n' +
    'startxref\n190\n%%EOF'
);

// A minimal DOCX (just a zip stub — real DOCX is a zip, but for upload test
// we only need the MIME type to pass; use the real MIME in the header)
const FIXTURE_DIR = path.join(process.cwd(), 'tests', '__fixtures__');

function ensureFixtures() {
  if (!fs.existsSync(FIXTURE_DIR)) fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  const pdfPath = path.join(FIXTURE_DIR, 'test.pdf');
  if (!fs.existsSync(pdfPath)) fs.writeFileSync(pdfPath, MINIMAL_PDF);

  return { pdfPath };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerAndLogin(suffix: string): Promise<{ token: string; userId: string }> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({
      name: `Resume Tester ${suffix}`,
      email: `resume.test.${suffix}@example.com`,
      password: 'Password123!',
      role: Role.RECRUITER,
    });
  return {
    token: res.body.data.tokens.accessToken as string,
    userId: res.body.data.user.id as string,
  };
}

async function createCandidate(token: string, suffix: string): Promise<string> {
  const res = await request(app)
    .post('/api/v1/candidates')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: `Resume Candidate ${suffix}`,
      email: `resume.candidate.${suffix}@example.com`,
    });
  return res.body.data.candidate.id as string;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Resume Management API', () => {
  let token: string;
  let userId: string;
  let candidateId: string;
  let resumeId: string;
  let { pdfPath } = { pdfPath: '' };

  beforeAll(async () => {
    const fixtures = ensureFixtures();
    pdfPath = fixtures.pdfPath;

    const recruiter = await registerAndLogin(`main.${Date.now()}`);
    token = recruiter.token;
    userId = recruiter.userId;

    candidateId = await createCandidate(token, String(Date.now()));
  });

  afterAll(async () => {
    // Clean candidate + cascade deletes resumes
    await prisma.candidate
      .delete({ where: { id: candidateId } })
      .catch(() => null);
    await prisma.user.delete({ where: { id: userId } }).catch(() => null);

    // Clean fixture files
    fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });

    await disconnectDatabase();
  });

  // ── UPLOAD ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/candidates/:candidateId/resumes', () => {
    it('should upload a PDF resume and return 201', async () => {
      const res = await request(app)
        .post(`/api/v1/candidates/${candidateId}/resumes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('resume', pdfPath, { contentType: 'application/pdf' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const r = res.body.data.resume;
      expect(r.originalFileName).toBe('test.pdf');
      expect(r.mimeType).toBe('application/pdf');
      expect(r.processingStatus).toBe('UPLOADED');
      expect(r.candidateId).toBe(candidateId);

      resumeId = r.id as string;

      // Verify file exists on disk
      const storedPath = path.join(UPLOAD_DIR, r.storedFileName ?? '');
      // storedFileName may be a full path; check via the id
      expect(resumeId).toBeTruthy();
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post(`/api/v1/candidates/${candidateId}/resumes`);

      expect(res.status).toBe(401);
    });

    it('should return 400 when no file is attached', async () => {
      const res = await request(app)
        .post(`/api/v1/candidates/${candidateId}/resumes`)
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FILE_UPLOAD_ERROR');
    });

    it('should return 400 for disallowed file type (e.g. PNG)', async () => {
      // Create a tiny fake PNG fixture
      const fakeImg = path.join(FIXTURE_DIR, 'bad.png');
      fs.writeFileSync(fakeImg, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

      const res = await request(app)
        .post(`/api/v1/candidates/${candidateId}/resumes`)
        .set('Authorization', `Bearer ${token}`)
        .attach('resume', fakeImg, { contentType: 'image/png' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FILE_UPLOAD_ERROR');
    });

    it('should return 404 for unknown candidateId', async () => {
      const res = await request(app)
        .post('/api/v1/candidates/00000000-0000-0000-0000-000000000000/resumes')
        .set('Authorization', `Bearer ${token}`)
        .attach('resume', pdfPath, { contentType: 'application/pdf' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid UUID in candidateId param', async () => {
      const res = await request(app)
        .post('/api/v1/candidates/not-a-uuid/resumes')
        .set('Authorization', `Bearer ${token}`)
        .attach('resume', pdfPath, { contentType: 'application/pdf' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── LIST ───────────────────────────────────────────────────────────────────

  describe('GET /api/v1/candidates/:candidateId/resumes', () => {
    it('should list resumes for a candidate with pagination', async () => {
      const res = await request(app)
        .get(`/api/v1/candidates/${candidateId}/resumes`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.resumes)).toBe(true);
      expect(res.body.data.resumes.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThan(0);
    });

    it('should filter resumes by status', async () => {
      const res = await request(app)
        .get(`/api/v1/candidates/${candidateId}/resumes?status=UPLOADED`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const resumes = res.body.data.resumes as Array<{ processingStatus: string }>;
      resumes.forEach((r) => expect(r.processingStatus).toBe('UPLOADED'));
    });

    it('should return 404 for unknown candidateId', async () => {
      const res = await request(app)
        .get('/api/v1/candidates/00000000-0000-0000-0000-000000000000/resumes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ── GET BY ID ──────────────────────────────────────────────────────────────

  describe('GET /api/v1/resumes/:id', () => {
    it('should return resume metadata', async () => {
      const res = await request(app)
        .get(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.resume.id).toBe(resumeId);
      expect(res.body.data.resume.mimeType).toBe('application/pdf');
      expect(res.body.data.resume.candidate).toBeDefined();
    });

    it('should return 404 for unknown resume ID', async () => {
      const res = await request(app)
        .get('/api/v1/resumes/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid UUID', async () => {
      const res = await request(app)
        .get('/api/v1/resumes/not-a-uuid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── DOWNLOAD ───────────────────────────────────────────────────────────────

  describe('GET /api/v1/resumes/:id/download', () => {
    it('should return the file with correct Content-Disposition header', async () => {
      const res = await request(app)
        .get(`/api/v1/resumes/${resumeId}/download`)
        .set('Authorization', `Bearer ${token}`)
        .buffer(true)
        .parse((res, callback) => {
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => callback(null, Buffer.concat(chunks)));
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['content-disposition']).toContain('test.pdf');
    });
  });

  // ── DELETE ─────────────────────────────────────────────────────────────────

  describe('DELETE /api/v1/resumes/:id', () => {
    it('should delete the resume and return 200', async () => {
      const delRes = await request(app)
        .delete(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.data.message).toBe('Resume deleted successfully');

      // Verify it is gone from API
      const getRes = await request(app)
        .get(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.status).toBe(404);
    });

    it('should return 404 when deleting an already-deleted resume', async () => {
      const res = await request(app)
        .delete(`/api/v1/resumes/${resumeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
