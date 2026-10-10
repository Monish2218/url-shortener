import { Router } from "express";
import { createUrlSchema } from "../validators/url.js";
import {
  createShortUrl,
  getUrlById,
  deleteUrlById,
} from "../services/url.service.js";

const router = Router();

router.post("/", async (req, res) => {
  const result = createUrlSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      error: "Invalid request body",
      details: result.error.flatten,
    });
  }

  const { originalUrl, expiresAt } = result.data;

  if (expiresAt && new Date(expiresAt) <= new Date()) {
    return res.status(400).json({
      error: "Expiration time must be in the future",
    });
  }

  const url = await createShortUrl(originalUrl, expiresAt);

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
  const url = await getUrlById(req.params.id);

  if (!url) {
    return res.status(404).json({
      error: "URL not found",
    });
  }

  return res.status(200).json({
    id: url.id,
    shortCode: url.short_code,
    shortUrl: `http://localhost:3000/${url.short_code}`,
    originalUrl: url.original_url,
    createdAt: url.created_at,
    expiresAt: url.expires_at,
    clickCount: url.click_count,
  });
});

router.delete("/:id", async (req, res) => {
  const deleted = await deleteUrlById(req.params.id);

  if (!deleted) {
    return res.status(404).json({
      error: "URL not found",
    });
  }

  return res.status(204).send();
});

export default router;