import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/:shortCode", async (req, res) => {
  const { shortCode } = req.params;

  const result = await pool.query(
    `
      SELECT original_url, expires_at
      FROM urls
      WHERE short_code = $1
    `,
    [shortCode],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: "Short URL not found",
    });
  }

  const url = result.rows[0];

  if (url.expires_at && new Date(url.expires_at) <= new Date()) {
    return res.status(410).json({
      error: "Short URL has expired",
    });
  }

  return res.redirect(302, url.original_url);
});

export default router;