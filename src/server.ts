import app from "./app.js";
import pool from "./db.js";
import { config } from "./config.js";

const server = app.listen(config.port, () => {
  console.log(`Server running at ${config.baseUrl}`);
});

function shutdown(signal: string) {
  console.log(`${signal} received. Shutting down...`);

  server.close(async () => {
    console.log("HTTP server closed.");

    await pool.end();

    console.log("Database pool closed.");

    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

export default server;