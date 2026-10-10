import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import pool from "../src/db.js";

describe("GET /:shortCode", () => {
  it("redirects an active short URL", async () => {
    const insertResult = await pool.query(
      `
        INSERT INTO urls (short_code, original_url)
        VALUES ($1, $2)
        RETURNING id
      `,
      ["testActiv1", "https://example.com"],
    );

    const id = insertResult.rows[0].id;

    const response = await request(app)
      .get("/testActiv1")
      .expect(302);

    expect(response.headers.location).toBe("https://example.com");

    const result = await pool.query(
      `
        SELECT click_count
        FROM urls
        WHERE id = $1
      `,
      [id],
    );

    expect(result.rows[0].click_count).toBe("1");

    await pool.query("DELETE FROM urls WHERE id = $1", [id]);
  });

  it("returns 410 for an expired short URL", async () => {
    const insertResult = await pool.query(
        `
        INSERT INTO urls (short_code, original_url, expires_at)
        VALUES ($1, $2, NOW() - INTERVAL '1 hour')
        RETURNING id
        `,
        ["testExpir1", "https://example.com"],
    );

    const id = insertResult.rows[0].id;

    await request(app)
        .get("/testExpir1")
        .expect(410);

    const result = await pool.query(
        `
        SELECT click_count
        FROM urls
        WHERE id = $1
        `,
        [id],
    );

    expect(result.rows[0].click_count).toBe("0");

    await pool.query("DELETE FROM urls WHERE id = $1", [id]);
  });

  it("returns 404 for a nonexistent short URL", async () => {
    await request(app)
        .get("/doesNotExist1")
        .expect(404);
  });
});