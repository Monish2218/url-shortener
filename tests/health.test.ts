import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("GET /api/health", () => {
  it("returns a healthy status", async () => {
    const response = await request(app)
      .get("/api/health")
      .expect(200);

    expect(response.body).toEqual({
      status: "ok",
    });
  });
});