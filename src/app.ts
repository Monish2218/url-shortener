import express from "express";
import urlRouter from "./routes/url.js"
import redirectRouter from "./routes/redirect.js"
import { errorHandler } from "./middleware/error-handler.js";

const app = express();

app.use(express.json());

app.use("/api/urls", urlRouter);
app.use("/", redirectRouter);

app.get('/health', (_req, res)=>{
    res.status(200).json({status:'OK'})
})

app.use(errorHandler);

export default app;