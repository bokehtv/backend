import request from 'supertest';
import app from './index';

describe('Health Check API', () => {
  it('should return a 200 status and UP status message', async () => {
    const response = await request(app).get('/api/v1/health');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'UP');
    expect(response.body).toHaveProperty('timestamp');
  });
});
