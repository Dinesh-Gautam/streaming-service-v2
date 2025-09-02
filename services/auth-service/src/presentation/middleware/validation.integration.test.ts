import express from "express";
import request from "supertest";
import { processRequest } from "zod-express-middleware";
import {
  loginUserSchema,
  registerUserSchema,
} from "../../application/dtos/zod-schemas";
import { errorHandler } from "./error-handler.middleware";

const app = express();
app.use(express.json());

app.post(
  "/register",
  processRequest({ body: registerUserSchema }),
  (req, res) => {
    res.status(200).send("OK");
  }
);

app.post("/login", processRequest({ body: loginUserSchema }), (req, res) => {
  res.status(200).send("OK");
});

app.use(errorHandler);

describe("Validation Middleware", () => {
  describe("POST /register", () => {
    it("should return 400 if email is invalid", async () => {
      const response = await request(app).post("/register").send({
        email: "invalid-email",
        password: "password123",
      });
      expect(response.status).toBe(400);
    });

    it("should return 400 if password is too short", async () => {
      const response = await request(app).post("/register").send({
        email: "test@example.com",
        password: "123",
      });
      expect(response.status).toBe(400);
    });

    it("should return 200 if data is valid", async () => {
      const response = await request(app).post("/register").send({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
      });
      expect(response.status).toBe(200);
    });
  });

  describe("POST /login", () => {
    it("should return 400 if email is invalid", async () => {
      const response = await request(app).post("/login").send({
        email: "invalid-email",
        password: "password123",
      });
      expect(response.status).toBe(400);
    });

    it("should return 200 if data is valid", async () => {
      const response = await request(app).post("/login").send({
        email: "test@example.com",
        password: "password123",
      });
      expect(response.status).toBe(200);
    });
  });
});
