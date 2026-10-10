import pool from "../db.js";
import { generateShortCode } from "../utils/short-code.js";

const MAX_INSERT_ATTEMPTS = 5;

export async function createShortUrl(
  originalUrl: string,
  expiresAt: string | undefined,
) {
  for (let attempt = 0; attempt < MAX_INSERT_ATTEMPTS; attempt++) {
    const shortCode = generateShortCode();

    try {
      const result = await pool.query(
        `
          INSERT INTO urls (short_code, original_url, expires_at)
          VALUES ($1, $2, $3)
          RETURNING
            id,
            short_code,
            original_url,
            created_at,
            expires_at,
            click_count
        `,
        [shortCode, originalUrl, expiresAt ?? null],
      );

      return result.rows[0];
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "23505"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Failed to generate a unique short code");
}

export async function getUrlById(id: string) {
  const result = await pool.query(
    `
      SELECT
        id,
        short_code,
        original_url,
        created_at,
        expires_at,
        click_count
      FROM urls
      WHERE id = $1
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export async function deleteUrlById(id: string) {
  const result = await pool.query(
    `
      DELETE FROM urls
      WHERE id = $1
      RETURNING id
    `,
    [id],
  );

  return result.rows[0] ?? null;
}

export type ResolveUrlResult =
  | { status: "not_found" }
  | { status: "expired" }
  | { status: "active"; originalUrl: string };

export async function resolveShortUrl(
  shortCode: string,
): Promise<ResolveUrlResult> {
  const result = await pool.query(
    `
      UPDATE urls
      SET click_count = click_count + 1
      WHERE short_code = $1
        AND (expires_at IS NULL OR expires_at > NOW())
      RETURNING original_url
    `,
    [shortCode],
  );

  if (result.rows.length > 0) {
    return {
      status: "active",
      originalUrl: result.rows[0].original_url,
    };
  }

  // The URL wasn't active. Determine why.
  const existingUrl = await pool.query(
    `
      SELECT expires_at
      FROM urls
      WHERE short_code = $1
    `,
    [shortCode],
  );

  if (existingUrl.rows.length === 0) {
    return { status: "not_found" };
  }

  return { status: "expired" };
}