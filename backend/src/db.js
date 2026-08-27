/**
 * src/db.js
 * Shared Postgres connection pool via postgres.js, exported as a
 * tagged-template `sql` function. Every query built with it is
 * parameterized by construction — never string-concatenated.
 */

import postgres from "postgres";
import { env } from "./config/env.js";

export const sql = postgres(env.databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});
