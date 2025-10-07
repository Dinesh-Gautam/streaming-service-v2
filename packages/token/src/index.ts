import jwt from 'jsonwebtoken';

interface DecodedToken {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

export class TokenService {
  private readonly secret: string;

  constructor(secret: string) {
    if (!secret) {
      secret = process.env.JWT_SECRET || '';
    }

    if (!secret) {
      throw new Error('JWT secret must be provided');
    }

    this.secret = secret;
  }

  verifyToken(token: string): DecodedToken | null {
    try {
      const decoded = jwt.verify(token, this.secret) as DecodedToken;
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  isUserAdmin(token: string): boolean {
    const decoded = this.verifyToken(token);
    return decoded?.role === 'ADMIN';
  }
}
