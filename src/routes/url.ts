import { Router } from "express";
import { createUrlSchema } from "../validators/url.js";
import { generateShortCode } from "../utils/short-code.js";
import pool from "../db.js";

const router = Router();

router.post("/", async (req, res) => {
    const result = createUrlSchema.safeParse(req.body);

    if(!result.success){
        return res.status(400).json({
            error: "Invalid request body",
            details: result.error.flatten,
        });
    }

    const { originalUrl } = result.data;

    const shortCode = generateShortCode();

    const dbResult = await pool.query(
        `
        INSERT INTO urls (short_code, original_url)
        VALUES ($1, $2)
        RETURNING id, short_code, original_url, created_at, expires_at
        `,
        [shortCode, originalUrl],
    );

    const url = dbResult.rows[0];

    return res.status(201).json({
        id: url.id,
        shortCode: url.short_code,
        shortUrl: `http://localhost:3000/${url.short_code}`,
        originalUrl: url.original_url,
        createdAt: url.created_at,
        expiresAt: url.expires_at,
    });
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `
      SELECT id, short_code, original_url, created_at, expires_at
      FROM urls
      WHERE id = $1
    `,
    [id],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: "URL not found",
    });
  }

  const url = result.rows[0];

  return res.status(200).json({
    id: url.id,
    shortCode: url.short_code,
    shortUrl: `http://localhost:3000/${url.short_code}`,
    originalUrl: url.original_url,
    createdAt: url.created_at,
    expiresAt: url.expires_at,
  });
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `
      DELETE FROM urls
      WHERE id = $1
      RETURNING id
    `,
    [id],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: "URL not found",
    });
  }

  return res.status(204).send();
});

export default router;