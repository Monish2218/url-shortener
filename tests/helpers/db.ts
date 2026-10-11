import pool from "../../src/db.js";

export async function cleanupUrl(id: string) {
  await pool.query("DELETE FROM urls WHERE id = $1", [id]);
}