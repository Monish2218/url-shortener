import app from "./app.js";
import { config } from "./config.js";
import pool from "./db.js";

const server = app.listen(config.port, async()=>{
    console.log(`Server running at ${config.baseUrl}`);

    try {
        const result = await pool.query("SELECT NOW()");
        console.log("Database connected:", result.rows[0]);
    } catch (error) {
        console.error("Database connection failed:", error);
    }
});

export default server;