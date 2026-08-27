/**
 * src/app.js
 * Express app assembly — kept separate from server.js so tests can
 * import the app without binding a port.
 */

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { attachSession } from "./middleware/auth.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./routes/auth.routes.js";
import { propertiesRouter } from "./routes/properties.routes.js";
import { managerRouter } from "./routes/manager.routes.js";
import { adminRouter } from "./routes/admin.routes.js";

export const app = express();

app.use(helmet());

// Corrected explicit origins array to accommodate secure credentials verification
app.use(
  cors({
    origin: [
      "https://espotel.netlify.app", // Your live production frontend URL
    ],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(attachSession);

// Generous global rate limit — real abuse protection lives per-route
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Tighter limit specifically on login/signup to slow credential stuffing.
const authLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10 });

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authLimiter, authRouter);
app.use("/api/properties", propertiesRouter);
app.use("/api/manager", managerRouter);
app.use("/api/admin", adminRouter);

app.use(notFoundHandler);
app.use(errorHandler);
