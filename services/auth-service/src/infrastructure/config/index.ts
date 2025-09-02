import * as dotenv from "dotenv";
import { logger } from "../logger";
import { configSchema } from "./schema";

dotenv.config();

const result = configSchema.safeParse(process.env);

if (!result.success) {
  logger.fatal(
    `Invalid environment variables: ${JSON.stringify(
      result.error.flatten(),
      null,
      2
    )}`
  );
  throw new Error("Invalid environment variables");
}

export const config = Object.freeze(result.data);
