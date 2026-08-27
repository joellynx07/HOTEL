/**
 * src/routes/auth.routes.js
 * Signup, login, logout, "who am I", and email verification.
 */

import { Router } from "express";
import { sql } from "../db.js";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  createEmailVerificationToken,
  verifyEmailVerificationToken,
} from "../middleware/auth.js";
import { sendVerificationEmail } from "../utils/mail.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";

export const authRouter = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

authRouter.post(
  "/signup",
  asyncHandler(async (req, res) => {
    const { email, password, fullName } = req.body;

    if (!email || !EMAIL_RE.test(email)) throw new HttpError(400, "Enter a valid email address");
    if (!password || password.length < 10) throw new HttpError(400, "Password must be at least 10 characters");
    if (!fullName?.trim()) throw new HttpError(400, "Full name is required");

    const [existing] = await sql`SELECT id FROM users WHERE email = ${email};`;
    if (existing) throw new HttpError(409, "An account with this email already exists");

    const passwordHash = await hashPassword(password);

    const [user] = await sql`
      INSERT INTO users (email, password_hash, full_name, role)
      VALUES (${email}, ${passwordHash}, ${fullName.trim()}, 'manager')
      RETURNING id, email;
    `;

    const verifyToken = await createEmailVerificationToken(user.id, user.email);
    await sendVerificationEmail(user.email, verifyToken);

    res.status(201).json({ ok: true });
  })
);

authRouter.post(
  "/verify-email",
  asyncHandler(async (req, res) => {
    const { token } = req.body;
    const decoded = token ? await verifyEmailVerificationToken(token) : null;
    if (!decoded) throw new HttpError(400, "This verification link is invalid or has expired.");

    await sql`UPDATE users SET email_verified_at = now() WHERE id = ${decoded.userId};`;
    res.json({ ok: true });
  })
);

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) throw new HttpError(400, "Email and password are required");

    const [user] = await sql`
      SELECT id, email, password_hash AS "passwordHash", role, is_active AS "isActive"
      FROM users WHERE email = ${email};
    `;
    if (!user || !user.isActive) throw new HttpError(401, "Incorrect email or password");

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) throw new HttpError(401, "Incorrect email or password");

    const token = await createSessionToken({ sub: user.id, role: user.role, email: user.email });
    setSessionCookie(res, token);

    res.json({ id: user.id, email: user.email, role: user.role });
  })
);

authRouter.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not signed in" });
  res.json(req.user);
});
