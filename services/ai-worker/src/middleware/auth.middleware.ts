import { NextFunction, Request, Response } from 'express';

import { TokenService } from '@monorepo/token';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ message: 'Authorization header is missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  const tokenService = new TokenService(process.env.JWT_SECRET!);

  try {
    const decoded = tokenService.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    if (!tokenService.isUserAdmin(token)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
