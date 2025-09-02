import express, { Request, Response, NextFunction } from "express";
import request from "supertest";
import { AppError } from "../../application/errors/app-error";
import { errorHandler } from "./error-handler.middleware";

const app = express();

app.get("/error", (req: Request, res: Response, next: NextFunction) => {
  next(new Error("Test error"));
});

app.get("/app-error", (req: Request, res: Response, next: NextFunction) => {
  next(new AppError("Test AppError", 404));
});

app.use(errorHandler);

describe("Error Handler Middleware", () => {
  it("should handle generic errors and return 500 in development", async () => {
    const response = await request(app).get("/error");
    expect(response.status).toBe(500);
    expect(response.body.status).toBe("error");
    expect(response.body.message).toBe("Test error");
    expect(response.body.stack).toBeDefined();
  });

  it("should handle generic errors and return 500 in production", async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.NODE_ENV = "production";
      const { errorHandler: errorHandlerProd } = await import(
        "./error-handler.middleware"
      );
      const appProd = express();
      appProd.get("/error", (req, res, next) => {
        next(new Error("Test error"));
      });
      appProd.use(errorHandlerProd);

      const response = await request(appProd).get("/error");
      expect(response.status).toBe(500);
      expect(response.body.status).toBe("error");
      expect(response.body.message).toBe("Something went very wrong");
      expect(response.body.stack).toBeUndefined();
    });
  });

  it("should handle AppError and return the correct status code and message", async () => {
    const response = await request(app).get("/app-error");
    expect(response.status).toBe(404);
    expect(response.body.status).toBe("error");
    expect(response.body.message).toBe("Test AppError");
  });
});
