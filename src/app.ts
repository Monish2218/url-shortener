import express from "express";
import urlRouter from "./routes/url.js"
import redirectRouter from "./routes/redirect.js"
import { errorHandler } from "./middleware/error-handler.js";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();

const createUrlLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.use(helmet());
app.use(express.json({ limit: "10kb" }));

app.get('/api/health', (_req, res)=>{
    res.status(200).json({status:'ok'})
})

app.use("/api/urls", createUrlLimiter, urlRouter);
app.use("/", redirectRouter);

app.use(errorHandler);

export default app;