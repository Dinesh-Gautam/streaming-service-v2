import { Server } from 'http';
import request from 'supertest';

import { LoginUserUseCase } from '@auth-service/application/use-cases/login-user.use-case';
import { app } from '@auth-service/presentation/main';

jest.mock('@auth-service/application/use-cases/login-user.use-case');

describe('Security Middleware', () => {
  let server: Server;

  beforeAll((done) => {
    server = app.listen(0, done);
  });

  afterAll((done) => {
    server.close(done);
  });

  beforeEach(() => {
    (LoginUserUseCase as jest.Mock).mockClear();
  });

  it('should set security headers', async () => {
    const res = await request(server).get('/');
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['strict-transport-security']).toBe(
      'max-age=31536000; includeSubDomains',
    );
    expect(res.headers['x-download-options']).toBe('noopen');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-xss-protection']).toBe('0');
  });

  it('should limit requests to the auth endpoints', async () => {
    const requests = Array(101)
      .fill(0)
      .map(() => request(server).post('/api/v1/auth/login').send({}));

    const responses = await Promise.all(requests);
    const lastResponse = responses[responses.length - 1];

    expect(lastResponse.status).toBe(429);
  }, 30000);
});
