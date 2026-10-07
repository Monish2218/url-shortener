import app from "./app.js";
import pool from "./db.js";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async()=>{
    console.log(`Server running at http://localhost:${PORT}`);

    try {
        const result = await pool.query("SELECT NOW()");
        console.log("Database connected:", result.rows[0]);
    } catch (error) {
        console.error("Database connection failed:", error);
    }
});

export default server;