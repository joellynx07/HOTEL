/**
 * src/middleware/auth.js
 * Session issuing/verification (JWT in an httpOnly cookie) and Express
 * middleware for role guards. The frontend never sees or handles the
 * token directly — the cookie is httpOnly and sent automatically by the
 * browser on same-site requests with `credentials: 'include'`.
 */

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";

const SESSION_COOKIE = "spynx_session";
const secretKey = new TextEncoder().encode(env.authSecret);
const SALT_ROUNDS = 12;

export async function createSessionToken(payload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: env.isProduction ? "none" : "lax", // 'none' for a cross-origin frontend in prod (with secure:true)
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

/**
 * Populates req.user from the session cookie if present and valid.
 * Does NOT reject the request on its own — routes decide whether a user
 * is required via requireRole below. Mount this globally.
 */
export async function attachSession(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next();

  try {
    const { payload } = await jwtVerify(token, secretKey);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
  } catch {
    // Expired/tampered token — treat as logged out, don't error the request.
  }
  next();
}

/** Express middleware factory: 401 if not signed in, 403 if wrong role. */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "You must be signed in to do that." });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do that." });
    }
    next();
  };
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

// ----------------------------------------------------------------------------
// Email verification tokens — separate, short-lived, single-purpose JWTs.
// ----------------------------------------------------------------------------

export async function createEmailVerificationToken(userId, email) {
  return new SignJWT({ purpose: "email_verify", uid: userId, email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey);
}

export async function verifyEmailVerificationToken(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (payload.purpose !== "email_verify") return null;
    return { userId: payload.uid, email: payload.email };
  } catch {
    return null;
  }
}
