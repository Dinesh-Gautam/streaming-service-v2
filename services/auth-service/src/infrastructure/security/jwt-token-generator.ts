import { Role } from "@prisma/client";
import { randomUUID } from "crypto";
import type { SignOptions } from "jsonwebtoken";
import * as jwt from "jsonwebtoken";
import { ITokenGenerator } from "../../application/interfaces/token-generator.interface";
import { config } from "../config";

export class JwtTokenGenerator implements ITokenGenerator {
  constructor(
    private readonly accessTokenSecret: string,
    private readonly refreshTokenSecret: string,
    private readonly expiresIn: SignOptions["expiresIn"]
  ) {}

  generate(
    userId: string,
    role: Role
  ): { accessToken: string; refreshToken: string } {
    const accessTokenPayload = { userId, role, jti: randomUUID() };
    const refreshTokenPayload = { userId, jti: randomUUID() };

    const accessToken = jwt.sign(accessTokenPayload, this.accessTokenSecret, {
      expiresIn: this.expiresIn,
    });

    const refreshToken = jwt.sign(
      refreshTokenPayload,
      this.refreshTokenSecret,
      {
        expiresIn: config.REFRESH_TOKEN_EXPIRATION as SignOptions["expiresIn"],
      }
    );
    return { accessToken, refreshToken };
  }
}
