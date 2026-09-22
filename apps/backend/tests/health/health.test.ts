import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { disconnectDatabase } from '../../src/config/database';

const app = createApp();

describe('Health & Readiness Probes API', () => {
  afterAll(async () => {
    await disconnectDatabase();
  });

  describe('GET /health (Liveness)', () => {
    it('should return 200 OK with service operational status', async () => {
      const res = await request(app).get('/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.service).toBe('smarthire-backend');
      expect(res.body.data.version).toBe('1.0.0');
      expect(res.body.data.timestamp).toBeDefined();
    });
  });

  describe('GET /health/ready (Readiness Probe)', () => {
    it('should return 200 OK with database connection check verified', async () => {
      const res = await request(app).get('/health/ready');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ready');
      expect(res.body.data.checks.server).toBe('ok');
      expect(res.body.data.checks.database).toBe('ok');
    });
  });

  describe('GET /api/v1/health (API Prefix Health)', () => {
    it('should return 200 OK on versioned API prefix', async () => {
      const res = await request(app).get('/api/v1/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('ok');
    });
  });
});
