/**
 * src/routes/admin.routes.js
 * Super-admin telemetry and access control. Every grant/revoke writes
 * to admin_audit_log so there's a durable record of who changed access
 * and why.
 */

import { Router } from "express";
import { sql } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";

export const adminRouter = Router();
adminRouter.use(requireRole("admin"));

/** GET /api/admin/dashboard — telemetry + pending approvals + subscriptions in one call. */
adminRouter.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const [telemetry] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE type = 'hotel')  AS hotels,
        COUNT(*) FILTER (WHERE type = 'hostel') AS hostels,
        COUNT(*) FILTER (WHERE status = 'pending') AS "pendingProperties"
      FROM properties;
    `;

    const [subscriptionStats] = await sql`
      SELECT COUNT(*) AS "activeSubscriptions" FROM subscriptions WHERE status = 'active';
    `;

    const pendingProperties = await sql`
      SELECT p.id, p.name, p.type, p.city, p.country_code AS "countryCode",
             p.created_at AS "createdAt", u.email AS "ownerEmail"
      FROM properties p
      JOIN users u ON u.id = p.owner_id
      WHERE p.status = 'pending'
      ORDER BY p.created_at ASC
      LIMIT 50;
    `;

    const subscriptions = await sql`
      SELECT s.id, s.plan, s.status, s.commission_rate AS "commissionRate",
             s.current_period_end AS "currentPeriodEnd", s.last_payment_at AS "lastPaymentAt",
             p.name AS "propertyName", p.type AS "propertyType"
      FROM subscriptions s
      JOIN properties p ON p.id = s.property_id
      ORDER BY CASE s.status WHEN 'past_due' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, s.current_period_end ASC
      LIMIT 100;
    `;

    res.json({
      telemetry: {
        hotels: Number(telemetry.hotels),
        hostels: Number(telemetry.hostels),
        pendingProperties: Number(telemetry.pendingProperties),
        activeSubscriptions: Number(subscriptionStats.activeSubscriptions),
      },
      pendingProperties,
      subscriptions,
    });
  })
);

/** POST /api/admin/properties/:id/review — approve or reject a pending listing. */
adminRouter.post(
  "/properties/:id/review",
  asyncHandler(async (req, res) => {
    const { decision } = req.body;
    if (!["approve", "reject"].includes(decision)) {
      throw new HttpError(400, "decision must be 'approve' or 'reject'");
    }

    const newStatus = decision === "approve" ? "active" : "rejected";

    const [property] = await sql`
      UPDATE properties SET status = ${newStatus}, updated_at = now()
      WHERE id = ${req.params.id} AND status = 'pending'
      RETURNING id;
    `;
    if (!property) throw new HttpError(404, "Property not found or already reviewed");

    if (decision === "approve") {
      await sql`
        INSERT INTO subscriptions (property_id, plan, status, current_period_start, current_period_end)
        VALUES (${req.params.id}, 'standard', 'trialing', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days')
        ON CONFLICT (property_id) DO NOTHING;
      `;
    }

    await sql`
      INSERT INTO admin_audit_log (admin_id, property_id, action, notes)
      VALUES (${req.user.id}, ${req.params.id}, ${decision === "approve" ? "approve_property" : "reject_property"}, NULL);
    `;

    res.json({ ok: true, status: newStatus });
  })
);

/** PATCH /api/admin/subscriptions/:id — grant or revoke platform access. */
adminRouter.patch(
  "/subscriptions/:id",
  asyncHandler(async (req, res) => {
    const { action, reason } = req.body;

    if (!["grant", "revoke"].includes(action)) throw new HttpError(400, "action must be 'grant' or 'revoke'");
    if (action === "revoke" && !reason?.trim()) throw new HttpError(400, "A reason is required to revoke access");

    const [subscription] = await sql`SELECT id, property_id AS "propertyId" FROM subscriptions WHERE id = ${req.params.id};`;
    if (!subscription) throw new HttpError(404, "Subscription not found");

    if (action === "revoke") {
      await sql`
        UPDATE subscriptions
        SET status = 'revoked', revoked_at = now(), revoked_by = ${req.user.id}, revoked_reason = ${reason}
        WHERE id = ${req.params.id};
      `;
    } else {
      await sql`
        UPDATE subscriptions
        SET status = 'active', revoked_at = NULL, revoked_by = NULL, revoked_reason = NULL,
            current_period_start = CURRENT_DATE, current_period_end = CURRENT_DATE + INTERVAL '30 days'
        WHERE id = ${req.params.id};
      `;
    }

    await sql`
      INSERT INTO admin_audit_log (admin_id, property_id, action, notes)
      VALUES (${req.user.id}, ${subscription.propertyId}, ${action === "revoke" ? "revoke_access" : "grant_access"}, ${reason ?? "Access restored"});
    `;

    res.json({ ok: true });
  })
);
