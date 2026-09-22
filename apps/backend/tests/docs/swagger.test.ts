import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { disconnectDatabase } from '../../src/config/database';
import { getSwaggerSpec } from '../../src/docs/swagger';

const app = createApp();

describe('Swagger & OpenAPI Documentation', () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('OpenAPI Specification Loader', () => {
    it('should parse and load valid OpenAPI 3.0 specification', () => {
      const spec = getSwaggerSpec();

      expect(spec).toBeDefined();
      expect(spec.openapi).toBe('3.0.3');
      expect((spec.info as Record<string, unknown>).title).toBe('SmartHire API');
      expect(spec.paths).toBeDefined();
      expect(Object.keys(spec.paths as Record<string, unknown>).length).toBeGreaterThan(0);
    });

    it('should cover key API resource paths', () => {
      const spec = getSwaggerSpec() as { paths: Record<string, unknown> };
      const paths = Object.keys(spec.paths);

      expect(paths).toContain('/api/v1/auth/register');
      expect(paths).toContain('/api/v1/auth/login');
      expect(paths).toContain('/api/v1/jobs');
      expect(paths).toContain('/api/v1/candidates');
      expect(paths).toContain('/api/v1/candidates/{candidateId}/resumes');
      expect(paths).toContain('/api/v1/resumes/{id}');
      expect(paths).toContain('/api/v1/applications');
      expect(paths).toContain('/api/v1/ranking/jobs/{id}');
      expect(paths).toContain('/api/v1/reports/overview');
    });
  });

  describe('GET /api/v1/docs (Swagger UI)', () => {
    it('should serve or redirect to Swagger UI documentation page with trailing slash', async () => {
      const res = await request(app).get('/api/v1/docs/');

      expect([200, 301, 302]).toContain(res.status);
      if (res.status === 200) {
        expect(res.text).toContain('id="swagger-ui"');
        expect(res.text).toContain('SmartHire API Docs');
      }
    });

    it('should redirect or serve Swagger UI without trailing slash', async () => {
      const res = await request(app).get('/api/v1/docs');

      expect([200, 301, 302]).toContain(res.status);
      // It should NOT return an authentication error
      expect(res.status).not.toBe(401);
      if (res.body && res.body.error) {
        expect(res.body.error.code).not.toBe('AUTHENTICATION_ERROR');
      }
    });

    it('should return 404 Not Found for non-existent API routes instead of authentication error', async () => {
      const res = await request(app).get('/api/v1/non-existent-route-xyz');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
