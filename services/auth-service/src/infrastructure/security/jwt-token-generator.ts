import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';

import type { ITokenGenerator } from '@auth-service/application/interfaces/token-generator.interface';
import type { SignOptions } from 'jsonwebtoken';

import { config } from '@auth-service/infrastructure/config';
import { Role } from '@prisma/client';

export class JwtTokenGenerator implements ITokenGenerator {
  constructor(
    private readonly accessTokenSecret: string,
    private readonly refreshTokenSecret: string,
    private readonly expiresIn: SignOptions['expiresIn'],
  ) {}

  generate(
    userId: string,
    role: Role,
    name: string,
    email: string,
  ): { accessToken: string; refreshToken: string } {
    const accessTokenPayload = { userId, role, jti: randomUUID(), name, email };
    const refreshTokenPayload = { userId, jti: randomUUID() };

    const accessToken = jwt.sign(accessTokenPayload, this.accessTokenSecret, {
      expiresIn: this.expiresIn,
    });

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      this.refreshTokenSecret,
      {
        expiresIn: config.REFRESH_TOKEN_EXPIRATION as SignOptions['expiresIn'],
      },
    );
    return { accessToken, refreshToken };
  }
}
