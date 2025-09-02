import "reflect-metadata";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { config } from "../infrastructure/config";
import { errorHandler } from "./middleware/error-handler.middleware";
import { authRouter } from "./routes/auth.routes";
import { logger } from "../infrastructure/logger";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/v1/auth", authLimiter, authRouter);

app.use(
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.info(`[${req.method}] ${req.url}`);
    next();
  }
);

app.use(errorHandler);

if (require.main === module) {
  app.listen(config.PORT, () => {
    logger.info(`Auth service running on port ${config.PORT}`);
  });
}

export { app };
