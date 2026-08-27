/**
 * src/routes/properties.routes.js
 * Public, unauthenticated endpoints — the discovery feed and booking
 * modal both read from here. No session required.
 */

import { Router } from "express";
import { sql } from "../db.js";
import { asyncHandler, HttpError } from "../middleware/errorHandler.js";

export const propertiesRouter = Router();

/** GET /api/properties/nearby?lat=&lng=&radiusKm=&type= */
propertiesRouter.get(
  "/nearby",
  asyncHandler(async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radiusKm ?? "25");
    const type = req.query.type ?? null; // "hotel" | "hostel" | null

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new HttpError(400, "lat and lng are required numeric query params");
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new HttpError(400, "lat/lng out of range");
    }

    const radiusMeters = Math.min(Math.max(radiusKm, 1), 200) * 1000;

    const rows = await sql`
      SELECT
        pl.id, pl.type, pl.name, pl.slug, pl.tagline, pl.city,
        pl.country_code    AS "countryCode",
        pl.contact_phone   AS "contactPhone",
        pl.whatsapp_phone  AS "whatsappPhone",
        pl.star_rating     AS "starRating",
        pl.from_price      AS "fromPrice",
        pl.currency,
        pl.has_active_offer  AS "hasActiveOffer",
        pl.has_premium_offer AS "hasPremiumOffer",
        pl.cover_image_url   AS "coverImageUrl",
        ST_Distance(p.location, ST_MakePoint(${lng}, ${lat})::geography) / 1000 AS "distanceKm"
      FROM public_property_listings pl
      JOIN properties p ON p.id = pl.id
      WHERE ST_DWithin(p.location, ST_MakePoint(${lng}, ${lat})::geography, ${radiusMeters})
        ${type ? sql`AND pl.type = ${type}` : sql``}
      ORDER BY p.location <-> ST_MakePoint(${lng}, ${lat})::geography
      LIMIT 60;
    `;

    res.set("Cache-Control", "private, max-age=30");
    res.json(rows);
  })
);

/** GET /api/properties/search?city= — fallback for users who decline geolocation. */
propertiesRouter.get(
  "/search",
  asyncHandler(async (req, res) => {
    const city = req.query.city?.trim();
    if (!city) throw new HttpError(400, "city is required");

    const rows = await sql`
      SELECT
        id, type, name, slug, tagline, city,
        country_code    AS "countryCode",
        contact_phone   AS "contactPhone",
        whatsapp_phone  AS "whatsappPhone",
        star_rating     AS "starRating",
        from_price      AS "fromPrice",
        currency,
        has_active_offer  AS "hasActiveOffer",
        has_premium_offer AS "hasPremiumOffer",
        cover_image_url   AS "coverImageUrl"
      FROM public_property_listings
      WHERE city ILIKE ${city + "%"}
      ORDER BY has_premium_offer DESC, from_price ASC
      LIMIT 60;
    `;

    res.set("Cache-Control", "private, max-age=60");
    res.json(rows);
  })
);

/** GET /api/properties/:id/inventory — bookable units for the booking modal. */
propertiesRouter.get(
  "/:id/inventory",
  asyncHandler(async (req, res) => {
    const rows = await sql`
      SELECT id, label, price_per_night AS "pricePerNight", currency, quantity_available AS "quantityAvailable"
      FROM inventory
      WHERE property_id = ${req.params.id} AND is_active AND quantity_available > 0
      ORDER BY price_per_night ASC;
    `;
    res.json(rows);
  })
);
