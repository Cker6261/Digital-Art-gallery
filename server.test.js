import request from 'supertest';
import express from 'express';
import { jest } from '@jest/globals';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/s3-request-presigner');

describe('Art Gallery Server', () => {
  let app;

  beforeEach(() => {
    app = express();
  });

  describe('GET /metrics', () => {
    it('should return prometheus metrics', async () => {
      const response = await request(app).get('/metrics');
      expect(response.status).toBe(200);
      expect(response.text).toContain('image_uploads_total');
      expect(response.text).toContain('image_views_total');
    });
  });

  describe('GET /images', () => {
    it('should return list of images', async () => {
      const response = await request(app).get('/images');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
