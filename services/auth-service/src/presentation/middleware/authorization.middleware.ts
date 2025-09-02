import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { AppError } from "../../application/errors/app-error";

export function authorize(requiredRole: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;

    if (!user || user.role !== requiredRole) {
      return next(new AppError("Forbidden", 403));
    }

    next();
  };
}
