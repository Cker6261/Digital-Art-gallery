import request from 'supertest';
// Import the actual app instance from server.js
import app from './server.js';

describe('Art Gallery Server', () => {
  describe('GET /metrics', () => {
    it('should return prometheus metrics', async () => {
      const response = await request(app).get('/metrics');
      expect(response.status).toBe(200);
      // Check for a known default metric instead of custom ones initially
      expect(response.text).toContain('process_cpu_seconds_total');
    });
  });

  describe('GET /images', () => {
    it('should return list of images', async () => {
      // Note: This test relies on AWS credentials being available
      // in the environment where the test runs (like GitHub Actions secrets)
      // It might fail locally if credentials are not set.
      const response = await request(app).get('/images');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      // We can't easily assert the *content* without mocking S3,
      // but checking the status and type is a good start.
    });
  });

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });
});
