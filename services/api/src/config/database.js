// services/api/src/db.js
import pkg from 'pg';
const { Pool } = pkg;

const { DATABASE_URL } = process.env;

export const pool = new Pool({
  connectionString: DATABASE_URL,
});
