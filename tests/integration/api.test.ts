import request from 'supertest';
import { app } from '@/api/server';

describe('API Integration', () => {
  let server: any;

  beforeAll(() => {
    server = app.listen(0);
  });

  afterAll(() => {
    server.close();
  });

  describe('GET /api/robots', () => {
    it('should return all robots', async () => {
      const response = await request(app).get('/api/robots');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('robots');
      expect(Array.isArray(response.body.robots)).toBe(true);
    });

    it('should include robot details', async () => {
      const response = await request(app).get('/api/robots');
      
      const robot = response.body.robots[0];
      expect(robot).toHaveProperty('id');
      expect(robot).toHaveProperty('status');
      expect(robot).toHaveProperty('currentMissionId');
    });
  });

  describe('POST /api/robots/:id/cancel', () => {
    it('should cancel robot mission', async () => {
      // First get a robot ID
      const robotsResponse = await request(app).get('/api/robots');
      const robotId = robotsResponse.body.robots[0].id;
      
      const response = await request(app)
        .post(`/api/robots/${robotId}/cancel`)
        .send();
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should handle invalid robot ID', async () => {
      const response = await request(app)
        .post('/api/robots/invalid-id/cancel')
        .send();
      
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/dashboard/stats', () => {
    it('should return fleet statistics', async () => {
      const response = await request(app).get('/api/dashboard/stats');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('fleetStats');
      expect(response.body.fleetStats).toHaveProperty('total');
      expect(response.body.fleetStats).toHaveProperty('idle');
    });
  });
});