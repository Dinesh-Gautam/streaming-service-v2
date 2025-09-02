import * as jwt from 'jsonwebtoken';

import { AppError } from '@auth-service/application/errors/app-error';
import { JwtTokenValidator } from '@auth-service/infrastructure/security/jwt-token-validator';
import { Role } from '@prisma/client';

jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('JwtTokenValidator', () => {
  const secret = 'test-secret';
  const refreshSecret = 'test-refresh-secret';
  let tokenValidator: JwtTokenValidator;

  beforeEach(() => {
    tokenValidator = new JwtTokenValidator(secret, refreshSecret);
    mockedJwt.verify.mockClear();
  });

  describe('validate', () => {
    it('should return the decoded payload for a valid token', async () => {
      const token = 'valid-token';
      const decodedPayload = {
        userId: 'user-123',
        role: Role.USER,
        jti: 'jti-123',
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      };
      mockedJwt.verify.mockReturnValue(decodedPayload as any);

      const result = await tokenValidator.validate(token);

      expect(result).toEqual(decodedPayload);
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, secret);
    });

    it('should throw an AppError for an invalid token', async () => {
      const token = 'invalid-token';
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(tokenValidator.validate(token)).rejects.toThrow(
        new AppError('Invalid token', 401),
      );
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, secret);
    });

    it('should throw an AppError for a token with missing payload fields', async () => {
      const token = 'missing-fields-token';
      const decodedPayload = { userId: 'user-123' };
      mockedJwt.verify.mockReturnValue(decodedPayload as any);

      await expect(tokenValidator.validate(token)).rejects.toThrow(
        new AppError('Invalid token', 401),
      );
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, secret);
    });
  });

  describe('refresh token validate', () => {
    it('should return the decoded payload for a valid refresh token', async () => {
      const token = 'valid-token';
      const decodedPayload = {
        userId: 'user-123',
        jti: 'jti-123',
        exp: Math.floor(Date.now() / 1000) + 60 * 60,
      };
      mockedJwt.verify.mockReturnValue(decodedPayload as any);

      const result = await tokenValidator.validateRefreshToken(token);

      expect(result).toEqual(decodedPayload);
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, refreshSecret);
    });

    it('should throw an AppError for an invalid refresh token', async () => {
      const token = 'invalid-token';
      mockedJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(tokenValidator.validateRefreshToken(token)).rejects.toThrow(
        new AppError('Invalid token', 401),
      );
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, refreshSecret);
    });

    it('should throw an AppError for a refresh token with missing payload fields', async () => {
      const token = 'missing-fields-token';
      const decodedPayload = { userId: 'user-123' };
      mockedJwt.verify.mockReturnValue(decodedPayload as any);

      await expect(tokenValidator.validateRefreshToken(token)).rejects.toThrow(
        new AppError('Invalid token', 401),
      );
      expect(mockedJwt.verify).toHaveBeenCalledWith(token, refreshSecret);
    });
  });
});
