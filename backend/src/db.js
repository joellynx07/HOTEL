import pg from 'pg';
import { env } from './config/env.js';

const { Pool } = pg;

// Strict connection engine targeting the Neon pooled interface
export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: {
    rejectUnauthorized: false // Required for secure production handshakes on cloud platforms
  },
  max: 10, // Prevents serverless environments from overloading free connection limits
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
  console.error('Unexpected database connection loss:', err);
});
