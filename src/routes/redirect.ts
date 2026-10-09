import { Router } from "express";
import pool from "../db.js";

const router = Router();

router.get("/:shortCode", async (req, res) => {
  const { shortCode } = req.params;

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

  if (result.rows.length === 0) {
    return res.status(404).json({
      error: "Short URL not found",
    });
  }

  return res.redirect(302, result.rows[0].original_url);
});

export default router;