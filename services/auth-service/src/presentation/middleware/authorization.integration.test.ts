import 'reflect-metadata';

import request from 'supertest';

import { config } from '@auth-service/infrastructure/config';
import { JwtTokenGenerator } from '@auth-service/infrastructure/security/jwt-token-generator';
import { app } from '@auth-service/presentation/main';
import { Role } from '@prisma/client';

describe('Authorization Middleware', () => {
  let tokenGenerator: JwtTokenGenerator;

  beforeAll(() => {
    tokenGenerator = new JwtTokenGenerator(
      config.JWT_SECRET,
      config.JWT_SECRET,
      config.ACCESS_TOKEN_EXPIRATION as any,
    );
  });

  describe('GET /api/v1/admin', () => {
    it('should return 401 Unauthorized if no token is provided', async () => {
      const response = await request(app).get('/api/v1/auth/admin');
      expect(response.status).toBe(401);
    });

    it('should return 403 Forbidden if the user does not have the ADMIN role', async () => {
      const { accessToken } = tokenGenerator.generate(
        'user-id',
        Role.USER,
        'user',
        'user-emaile',
      );
      const response = await request(app)
        .get('/api/v1/auth/admin')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(response.status).toBe(403);
    });

    it('should return 200 OK if the user has the ADMIN role', async () => {
      const { accessToken } = tokenGenerator.generate(
        'admin-id',
        Role.ADMIN,
        'admin',
        'admin-email',
      );
      const response = await request(app)
        .get('/api/v1/auth/admin')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(response.status).toBe(200);
    });
  });
});
