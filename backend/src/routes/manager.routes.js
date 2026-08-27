/**
 * src/routes/manager.routes.js
 * Everything a signed-in, verified manager can do. Every ownership check
 * is a WHERE clause against `owner_id = req.user.id` — a manager can
 * never touch a property that isn't theirs, even by guessing an id.
 */

import { Router } from "express";
import { sql } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";
import { geocodeCity } from "../utils/geocode.js";

export const managerRouter = Router();
managerRouter.use(requireRole("manager"));

/** Blocks routes that need a verified email, without blocking the whole router (onboarding needs this too). */
async function requireVerified(req) {
  const [user] = await sql`SELECT email_verified_at AS "emailVerifiedAt" FROM users WHERE id = ${req.user.id};`;
  if (!user?.emailVerifiedAt) throw new HttpError(403, "Please verify your email before continuing.");
}

function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/** POST /api/manager/onboarding — creates the manager's first property. */
managerRouter.post(
  "/onboarding",
  asyncHandler(async (req, res) => {
    await requireVerified(req);

    const { type, name, city, countryCode, contactPhone, tosVersion } = req.body;

    if (!["hotel", "hostel"].includes(type)) throw new HttpError(400, "type must be 'hotel' or 'hostel'");
    if (!name?.trim() || !city?.trim() || !countryCode || !contactPhone?.trim()) {
      throw new HttpError(400, "Missing required fields");
    }

    const [existing] = await sql`SELECT id FROM properties WHERE owner_id = ${req.user.id};`;
    if (existing) throw new HttpError(409, "You've already listed a property");

    const { lat, lng } = await geocodeCity(city, countryCode);

    const baseSlug = slugify(`${name}-${city}`);
    let slug = baseSlug;
    for (let attempt = 1; attempt <= 5; attempt++) {
      const [collision] = await sql`SELECT id FROM properties WHERE slug = ${slug};`;
      if (!collision) break;
      slug = `${baseSlug}-${attempt}`;
    }

    await sql.begin(async (tx) => {
      await tx`
        UPDATE users SET tos_accepted_at = now(), revenue_agreement_at = now(), tos_version = ${tosVersion}
        WHERE id = ${req.user.id};
      `;

      const [property] = await tx`
        INSERT INTO properties (owner_id, type, name, slug, address_line, city, country_code, lat, lng, contact_phone)
        VALUES (${req.user.id}, ${type}, ${name}, ${slug}, ${city}, ${city}, ${countryCode}, ${lat}, ${lng}, ${contactPhone})
        RETURNING id;
      `;

      await tx`
        INSERT INTO subscriptions (property_id, plan, status, current_period_start, current_period_end)
        VALUES (${property.id}, 'standard', 'trialing', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days');
      `;
    });

    res.status(201).json({ ok: true });
  })
);

/** GET /api/manager/dashboard — property + subscription + inventory in one call. */
managerRouter.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    await requireVerified(req);

    const [property] = await sql`
      SELECT id, type, name, status FROM properties WHERE owner_id = ${req.user.id} ORDER BY created_at ASC LIMIT 1;
    `;
    if (!property) return res.status(404).json({ error: "No property yet", needsOnboarding: true });

    const [subscription] = await sql`
      SELECT plan, status, current_period_end AS "currentPeriodEnd" FROM subscriptions WHERE property_id = ${property.id};
    `;

    const inventory = await sql`
      SELECT id, unit_type AS "unitType", label, capacity, price_per_night AS "pricePerNight",
             currency, quantity_total AS "quantityTotal", quantity_available AS "quantityAvailable"
      FROM inventory WHERE property_id = ${property.id} ORDER BY created_at ASC;
    `;

    res.json({ property, subscription, inventory });
  })
);

/** POST /api/manager/inventory — add a room/bed type. */
managerRouter.post(
  "/inventory",
  asyncHandler(async (req, res) => {
    await requireVerified(req);

    const { propertyId, unitType, label, capacity, pricePerNight, currency, quantityTotal } = req.body;

    if (!propertyId || !unitType || !label || !pricePerNight || !quantityTotal) {
      throw new HttpError(400, "Missing required fields");
    }
    if (!["room", "bed"].includes(unitType)) throw new HttpError(400, "unitType must be 'room' or 'bed'");
    if (Number(pricePerNight) <= 0 || Number(quantityTotal) < 1) {
      throw new HttpError(400, "Price must be positive and quantity at least 1");
    }

    const [owned] = await sql`SELECT id FROM properties WHERE id = ${propertyId} AND owner_id = ${req.user.id};`;
    if (!owned) throw new HttpError(404, "Property not found");

    const [created] = await sql`
      INSERT INTO inventory (property_id, unit_type, label, capacity, price_per_night, currency, quantity_total, quantity_available)
      VALUES (${propertyId}, ${unitType}, ${label}, ${capacity ?? 1}, ${pricePerNight}, ${currency ?? "USD"}, ${quantityTotal}, ${quantityTotal})
      RETURNING id, unit_type AS "unitType", label, capacity,
        price_per_night AS "pricePerNight", currency,
        quantity_total AS "quantityTotal", quantity_available AS "quantityAvailable";
    `;

    res.status(201).json(created);
  })
);

/** PATCH /api/manager/inventory/:id — update available quantity. */
managerRouter.patch(
  "/inventory/:id",
  asyncHandler(async (req, res) => {
    await requireVerified(req);
    const { quantityAvailable } = req.body;

    if (quantityAvailable === undefined || Number(quantityAvailable) < 0) {
      throw new HttpError(400, "quantityAvailable must be zero or greater");
    }

    // Ownership check via a join, so a manager can't edit another property's inventory.
    const [updated] = await sql`
      UPDATE inventory i
      SET quantity_available = LEAST(${quantityAvailable}, i.quantity_total), updated_at = now()
      FROM properties p
      WHERE i.id = ${req.params.id} AND i.property_id = p.id AND p.owner_id = ${req.user.id}
      RETURNING i.id, i.quantity_available AS "quantityAvailable";
    `;

    if (!updated) throw new HttpError(404, "Inventory item not found");
    res.json(updated);
  })
);
