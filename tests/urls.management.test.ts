import { describe, expect, it } from "vitest";
import request from "supertest";
import pool from "../src/db.js";
import app from "../src/app.js";
import { cleanupUrl } from "./helpers/db.js";

describe("URL management", () => {
  it("returns a URL by ID", async () => {
    const insertResult = await pool.query(
      `
        INSERT INTO urls (short_code, original_url)
        VALUES ($1, $2)
        RETURNING id
      `,
      ["getTest001", "https://example.com"],
    );

    const id = insertResult.rows[0].id;

    const response = await request(app)
      .get(`/api/urls/${id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id,
      shortCode: "getTest001",
      originalUrl: "https://example.com",
      expiresAt: null,
      clickCount: "0",
    });

    await cleanupUrl(id);
  });

  it("returns 404 when URL ID does not exist", async () => {
    await request(app)
      .get("/api/urls/999999999")
      .expect(404);
  });

  it("deletes an existing URL", async () => {
    const insertResult = await pool.query(
      `
        INSERT INTO urls (short_code, original_url)
        VALUES ($1, $2)
        RETURNING id
      `,
      ["dleteTest1", "https://example.com"],
    );

    const id = insertResult.rows[0].id;

    await request(app)
      .delete(`/api/urls/${id}`)
      .expect(204);

    const result = await pool.query(
      "SELECT id FROM urls WHERE id = $1",
      [id],
    );

    expect(result.rows).toHaveLength(0);
  });

  it("returns 404 when deleting a non-existent URL", async () => {
    await request(app)
      .delete("/api/urls/999999999")
      .expect(404);
  });
});