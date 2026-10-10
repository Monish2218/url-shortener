import { Router } from "express";
import { resolveShortUrl } from "../services/url.service.js";

const router = Router();

router.get("/:shortCode", async (req, res) => {
  const result = await resolveShortUrl(req.params.shortCode);

  if (result.status === "not_found") {
    return res.status(404).json({
      error: "Short URL not found",
    });
  }

  if (result.status === "expired") {
    return res.status(410).json({
      error: "Short URL has expired",
    });
  }

  return res.redirect(302, result.originalUrl);
});

export default router;