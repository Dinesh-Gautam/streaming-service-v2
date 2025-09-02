import 'reflect-metadata';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import { config } from '@auth-service/infrastructure/config';
import { logger } from '@auth-service/infrastructure/logger';
import { errorHandler } from '@auth-service/presentation/middleware/error-handler.middleware';
import { authRouter } from '@auth-service/presentation/routes/auth.routes';

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  }),
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/auth', authLimiter, authRouter);

app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info(`[${req.method}] ${req.url}`);
    next();
  },
);

app.use(errorHandler);

if (require.main === module) {
  app.listen(config.PORT, () => {
    logger.info(`Auth service running on port ${config.PORT}`);
  });
}

export { app };
