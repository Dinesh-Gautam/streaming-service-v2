import * as jwt from 'jsonwebtoken';

import { config } from '@auth-service/infrastructure/config';
import { JwtTokenGenerator } from '@auth-service/infrastructure/security/jwt-token-generator';
import { Role } from '@prisma/client';

jest.mock('jsonwebtoken');
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe('JwtTokenGenerator', () => {
  const accessTokenSecret = 'access-secret';
  const refreshTokenSecret = 'refresh-secret';
  const expiresIn = config.ACCESS_TOKEN_EXPIRATION as any;
  const refreshTokenExpiresIn = config.REFRESH_TOKEN_EXPIRATION as any;

  let tokenGenerator: JwtTokenGenerator;

  beforeEach(() => {
    tokenGenerator = new JwtTokenGenerator(
      accessTokenSecret,
      refreshTokenSecret,
      expiresIn,
    );
    mockedJwt.sign.mockClear();
  });

  describe('generate', () => {
    it('should generate an access token and a refresh token', () => {
      const userId = 'user-123';
      const role = Role.USER;
      const userName = 'John Doe';
      const userEmail = 'john.doe@example.com';
      const expectedAccessToken = 'access-token';
      const expectedRefreshToken = 'refresh-token';

      mockedJwt.sign
        .mockImplementationOnce((payload, secret, options) => {
          expect(secret).toBe(accessTokenSecret);
          expect(options?.expiresIn).toBe(expiresIn);
          return expectedAccessToken;
        })
        .mockImplementationOnce((payload, secret, options) => {
          expect(secret).toBe(refreshTokenSecret);
          expect(options?.expiresIn).toBe(refreshTokenExpiresIn);
          return expectedRefreshToken;
        });

      const { accessToken, refreshToken } = tokenGenerator.generate(
        userId,
        role,
        userName,
        userEmail,
      );

      expect(accessToken).toBe(expectedAccessToken);
      expect(refreshToken).toBe(expectedRefreshToken);
      expect(mockedJwt.sign).toHaveBeenCalledTimes(2);
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId, role, jti: expect.any(String) },
        accessTokenSecret,
        { expiresIn },
      );
      expect(mockedJwt.sign).toHaveBeenCalledWith(
        { userId, jti: expect.any(String) },
        refreshTokenSecret,
        { expiresIn: refreshTokenExpiresIn },
      );
    });
  });
});
