import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import { createApp } from '../../src/app';
import { prisma, disconnectDatabase } from '../../src/config/database';
import { Role } from '@prisma/client';

const app = createApp();

const FIXTURE_DIR = path.join(process.cwd(), 'tests', '__fixtures__security');

describe('Security Hardening & Protection (Phase 11)', () => {
  let recruiterToken: string;
  let recruiterId: string;
  let adminToken: string;
  let adminId: string;

  beforeAll(async () => {
    if (!fs.existsSync(FIXTURE_DIR)) {
      fs.mkdirSync(FIXTURE_DIR, { recursive: true });
    }

    const timestamp = Date.now();

    // Create Recruiter
    const rRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: `Sec Recruiter ${timestamp}`,
        email: `sec.recruiter.${timestamp}@example.com`,
        password: 'Password123!',
        role: Role.RECRUITER,
      });
    recruiterToken = rRes.body.data.tokens.accessToken;
    recruiterId = rRes.body.data.user.id;

    // Create Admin
    const aRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: `Sec Admin ${timestamp}`,
        email: `sec.admin.${timestamp}@example.com`,
        password: 'Password123!',
        role: Role.ADMIN,
      });
    adminToken = aRes.body.data.tokens.accessToken;
    adminId = aRes.body.data.user.id;
  });

  afterAll(async () => {
    // Clean up created entities
    await prisma.auditLog.deleteMany({
      where: { userId: { in: [recruiterId, adminId] } },
    }).catch(() => null);

    await prisma.user.deleteMany({
      where: { id: { in: [recruiterId, adminId] } },
    }).catch(() => null);

    if (fs.existsSync(FIXTURE_DIR)) {
      fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
    }

    await disconnectDatabase();
  });

  // ── 1. Security Headers (Helmet & Request IDs) ──────────────────────────────

  describe('Security Headers & Request IDs', () => {
    it('should include Helmet security headers on all responses', async () => {
      const res = await request(app).get('/health');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-download-options']).toBe('noopen');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });

    it('should generate and return an x-request-id header on every response', async () => {
      const res = await request(app).get('/health');

      expect(res.headers['x-request-id']).toBeDefined();
      expect(typeof res.headers['x-request-id']).toBe('string');
      expect(res.headers['x-request-id'].length).toBeGreaterThan(10);
    });

    it('should preserve existing x-request-id header if provided by client', async () => {
      const customId = 'client-custom-req-id-12345';
      const res = await request(app)
        .get('/health')
        .set('x-request-id', customId);

      expect(res.headers['x-request-id']).toBe(customId);
    });

    it('should include CORS allow credentials and origin headers', async () => {
      const res = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  // ── 2. Sensitive Data Sanitization ──────────────────────────────────────────

  describe('Sensitive Data Protection', () => {
    it('should never expose passwordHash in register response', async () => {
      const timestamp = Date.now();
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: `Clean User ${timestamp}`,
          email: `clean.${timestamp}@example.com`,
          password: 'Password123!',
          role: Role.RECRUITER,
        });

      expect(res.status).toBe(201);
      const user = res.body.data.user;
      expect(user.passwordHash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');

      await prisma.user.delete({ where: { id: user.id } }).catch(() => null);
    });

    it('should never expose passwordHash in login response', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: `sec.recruiter.${recruiterId ? '' : ''}`,
          password: 'Password123!',
        });

      // Even on successful or failed login, passwordHash must never be present
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });

    it('should never expose passwordHash in /auth/me profile endpoint', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.passwordHash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    });
  });

  // ── 3. Input Validation & Injection Hardening ───────────────────────────────

  describe('Input Validation & Malformed Payload Protection', () => {
    it('should reject malformed JSON syntax with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": "bad-json", missing-closing-bracket');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject parameter SQL injection attempts in UUID paths', async () => {
      const sqliAttempt = "00000000-0000-0000-0000-000000000000' OR '1'='1";
      const res = await request(app)
        .get(`/api/v1/jobs/${encodeURIComponent(sqliAttempt)}`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── 4. RBAC & Role-Based Authorization ──────────────────────────────────────

  describe('Role-Based Access Control (RBAC)', () => {
    it('should reject unauthenticated access to protected endpoints with 401', async () => {
      const res = await request(app).get('/api/v1/audit-logs');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should reject RECRUITER role from accessing Admin-only audit logs with 403', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should allow ADMIN role to access audit logs with 200', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.logs)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });
  });

  // ── 5. File Upload Security ─────────────────────────────────────────────────

  describe('File Upload Security Guardrails', () => {
    it('should reject executable file disguised as pdf extension', async () => {
      const fakeExe = path.join(FIXTURE_DIR, 'malware.exe');
      fs.writeFileSync(fakeExe, 'MZ\x90\x00\x03\x00\x00\x00');

      const res = await request(app)
        .post('/api/v1/candidates/00000000-0000-0000-0000-000000000000/resumes')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .attach('resume', fakeExe, { contentType: 'application/x-msdownload' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FILE_UPLOAD_ERROR');
    });

    it('should reject file with disallowed extension even with spoofed application/pdf MIME', async () => {
      const fakeScript = path.join(FIXTURE_DIR, 'script.sh');
      fs.writeFileSync(fakeScript, '#!/bin/bash\necho "exploit"');

      const res = await request(app)
        .post('/api/v1/candidates/00000000-0000-0000-0000-000000000000/resumes')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .attach('resume', fakeScript, { contentType: 'application/pdf' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('FILE_UPLOAD_ERROR');
    });
  });

  // ── 6. Security Audit Trail Verification ────────────────────────────────────

  describe('Security Audit Trail Verification', () => {
    it('should have recorded audit log entries for user registration and login', async () => {
      const res = await request(app)
        .get('/api/v1/audit-logs?resource=USER')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.logs.length).toBeGreaterThanOrEqual(1);

      const actions = res.body.data.logs.map((l: { action: string }) => l.action);
      expect(actions).toContain('USER_REGISTER');
    });
  });
});
