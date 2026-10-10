import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import pool from "../src/db.js";

describe("POST /api/urls", () => {
  it("creates a short URL", async () => {
    const response = await request(app)
      .post("/api/urls")
      .send({
        originalUrl: "https://example.com",
      })
      .expect(201);

    expect(response.body).toMatchObject({
      shortCode: expect.any(String),
      shortUrl: expect.any(String),
      originalUrl: "https://example.com",
      createdAt: expect.any(String),
      expiresAt: null,
    });

    expect(response.body.shortCode).toHaveLength(10);

    const result = await pool.query(
      `
        SELECT short_code, original_url, expires_at, click_count
        FROM urls
        WHERE id = $1
      `,
      [response.body.id],
    );

    expect(result.rows).toHaveLength(1);

    expect(result.rows[0]).toMatchObject({
      short_code: response.body.shortCode,
      original_url: "https://example.com",
      expires_at: null,
      click_count: "0",
    });

    await pool.query(
      "DELETE FROM urls WHERE id = $1",
      [response.body.id],
    );
  });

  it("rejects an invalid URL", async () => {
    const response = await request(app)
      .post("/api/urls")
      .send({
        originalUrl: "not-a-url",
      })
      .expect(400);

    expect(response.body.error).toBe("Invalid request body");
  });
});