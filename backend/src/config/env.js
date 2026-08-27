/**
 * src/config/env.js
 * Central place every other module pulls config from — fail fast at
 * startup if something required is missing, rather than failing deep
 * inside a request handler at 2am.
 */

import "dotenv/config";

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  authSecret: required("AUTH_SECRET"),
  appUrl: process.env.APP_URL ?? "http://localhost:5173", // frontend origin, for CORS + email links
  resendApiKey: process.env.RESEND_API_KEY ?? null,
  isProduction: process.env.NODE_ENV === "production",
};
