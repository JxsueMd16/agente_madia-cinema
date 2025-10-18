// services/api/src/controllers/healthController.js
import { pool } from '../config/database.js';
/**
 * Health check endpoint
 */
export async function checkHealth(req, res) {
  try {
    const result = await pool.query('SELECT 1 as ok');
    res.json({ 
      ok: true, 
      db: result.rows[0].ok === 1,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      ok: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}