-- ============================================================================
-- SPYNX — Core Database Schema
-- PostgreSQL 15+. Uses PostGIS for geolocation; a haversine fallback function
-- is included at the bottom for environments where PostGIS cannot be enabled.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";      -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "postgis";       -- geography type + GIST index

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

CREATE TYPE user_role         AS ENUM ('manager', 'admin');
CREATE TYPE property_type     AS ENUM ('hotel', 'hostel');
CREATE TYPE property_status   AS ENUM ('pending', 'active', 'suspended', 'rejected');
CREATE TYPE inventory_unit    AS ENUM ('room', 'bed');
CREATE TYPE media_kind        AS ENUM ('image', 'video');
CREATE TYPE subscription_plan AS ENUM ('standard', 'premium');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'revoked', 'trialing');

-- ----------------------------------------------------------------------------
-- USERS
-- Managers and the super-admin share one table, distinguished by `role`.
-- ----------------------------------------------------------------------------

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email               CITEXT NOT NULL UNIQUE,
    phone               VARCHAR(20),                     -- E.164, e.g. +14155552671
    password_hash       TEXT NOT NULL,
    full_name           VARCHAR(120) NOT NULL,
    role                user_role NOT NULL DEFAULT 'manager',

    email_verified_at   TIMESTAMPTZ,
    email_verify_token  TEXT,                             -- hashed token, single use
    email_verify_sent_at TIMESTAMPTZ,

    tos_accepted_at         TIMESTAMPTZ,                  -- Terms of Service
    revenue_agreement_at    TIMESTAMPTZ,                  -- Revenue/commission agreement
    tos_version              VARCHAR(20),                 -- e.g. "2026-01"

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT managers_must_accept_tos CHECK (
        role <> 'manager' OR (tos_accepted_at IS NOT NULL AND revenue_agreement_at IS NOT NULL)
        OR email_verified_at IS NULL -- allow the row to exist pre-onboarding-completion
    )
);

CREATE EXTENSION IF NOT EXISTS "citext"; -- case-insensitive email column above
CREATE INDEX idx_users_role ON users (role);

-- ----------------------------------------------------------------------------
-- PROPERTIES
-- One manager (owner) can list multiple properties.
-- ----------------------------------------------------------------------------

CREATE TABLE properties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type            property_type NOT NULL,
    name            VARCHAR(160) NOT NULL,
    slug            VARCHAR(180) NOT NULL UNIQUE,
    tagline         VARCHAR(200),                        -- short, real copy — not a placeholder
    description     TEXT,

    address_line    VARCHAR(220) NOT NULL,
    city            VARCHAR(100) NOT NULL,
    region          VARCHAR(100),
    country_code    CHAR(2) NOT NULL,                     -- ISO 3166-1 alpha-2
    postal_code     VARCHAR(20),

    -- Geolocation: geography(Point) stores (lng, lat) — note the order.
    location        GEOGRAPHY(Point, 4326) NOT NULL,
    lat             DOUBLE PRECISION NOT NULL,             -- kept denormalized for cheap reads/UI
    lng             DOUBLE PRECISION NOT NULL,

    contact_phone   VARCHAR(20) NOT NULL,                  -- used for tel: and wa.me links
    whatsapp_phone  VARCHAR(20),                            -- defaults to contact_phone if null

    status          property_status NOT NULL DEFAULT 'pending',
    star_rating     SMALLINT CHECK (star_rating BETWEEN 1 AND 5),

    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Geolocation lookup: "hotels/hostels near me" — this is the hot path.
CREATE INDEX idx_properties_location_gist ON properties USING GIST (location);
CREATE INDEX idx_properties_type_status   ON properties (type, status);
CREATE INDEX idx_properties_owner         ON properties (owner_id);

-- Keep `location` in sync with lat/lng whenever either changes.
CREATE OR REPLACE FUNCTION sync_property_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_property_location
BEFORE INSERT OR UPDATE OF lat, lng ON properties
FOR EACH ROW EXECUTE FUNCTION sync_property_location();

-- ----------------------------------------------------------------------------
-- OFFERS
-- Standard or premium promotional offers attached to a property.
-- ----------------------------------------------------------------------------

CREATE TABLE offers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id      UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    title            VARCHAR(160) NOT NULL,
    description      VARCHAR(400),
    discount_percent SMALLINT CHECK (discount_percent BETWEEN 1 AND 90),
    is_premium       BOOLEAN NOT NULL DEFAULT false,       -- premium placement in the feed
    valid_from       DATE NOT NULL,
    valid_to         DATE NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT valid_offer_window CHECK (valid_to >= valid_from)
);

CREATE INDEX idx_offers_property_active
    ON offers (property_id)
    WHERE valid_to >= CURRENT_DATE;

-- ----------------------------------------------------------------------------
-- INVENTORY
-- Rooms (hotels) or beds (hostels) — one polymorphic table, discriminated
-- by unit_type so filtering/sorting stays a single indexed query.
-- ----------------------------------------------------------------------------

CREATE TABLE inventory (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id        UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_type          inventory_unit NOT NULL,

    label              VARCHAR(120) NOT NULL,              -- "Deluxe Double", "Dorm Bed — Bay 3"
    capacity           SMALLINT NOT NULL DEFAULT 1,
    price_per_night    NUMERIC(10, 2) NOT NULL CHECK (price_per_night >= 0),
    currency           CHAR(3) NOT NULL DEFAULT 'USD',      -- ISO 4217
    quantity_total     INTEGER NOT NULL CHECK (quantity_total >= 0),
    quantity_available INTEGER NOT NULL CHECK (quantity_available >= 0),
    amenities          JSONB NOT NULL DEFAULT '[]',         -- ["ensuite_bathroom","ac","locker"]

    is_active          BOOLEAN NOT NULL DEFAULT true,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT available_within_total CHECK (quantity_available <= quantity_total)
);

CREATE INDEX idx_inventory_property   ON inventory (property_id);
CREATE INDEX idx_inventory_price      ON inventory (price_per_night);
CREATE INDEX idx_inventory_unit_type  ON inventory (unit_type);

-- ----------------------------------------------------------------------------
-- MEDIA
-- Multiple images per property plus a single optimized video slot.
-- ----------------------------------------------------------------------------

CREATE TABLE media (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id   UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    kind          media_kind NOT NULL,
    url           TEXT NOT NULL,
    thumbnail_url TEXT,                                   -- poster frame for video
    position      SMALLINT NOT NULL DEFAULT 0,             -- display order
    is_cover      BOOLEAN NOT NULL DEFAULT false,
    width         INTEGER,
    height        INTEGER,
    duration_seconds SMALLINT,                             -- video only
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT duration_only_for_video CHECK (
        (kind = 'video' AND duration_seconds IS NOT NULL) OR
        (kind = 'image' AND duration_seconds IS NULL)
    )
);

CREATE INDEX idx_media_property_position ON media (property_id, position);
-- Only one cover image per property.
CREATE UNIQUE INDEX idx_media_one_cover_per_property
    ON media (property_id) WHERE is_cover;

-- ----------------------------------------------------------------------------
-- SUBSCRIPTIONS
-- Drives platform access. The admin dashboard reads/writes this table to
-- grant or revoke access based on commission payment status.
-- ----------------------------------------------------------------------------

CREATE TABLE subscriptions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id           UUID NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
    plan                  subscription_plan NOT NULL DEFAULT 'standard',
    status                subscription_status NOT NULL DEFAULT 'trialing',
    commission_rate       NUMERIC(5, 2) NOT NULL DEFAULT 10.00, -- percent
    current_period_start  DATE NOT NULL DEFAULT CURRENT_DATE,
    current_period_end    DATE NOT NULL,
    last_payment_at       TIMESTAMPTZ,
    last_payment_reference VARCHAR(120),                  -- external payment/proof reference
    revoked_at            TIMESTAMPTZ,
    revoked_by            UUID REFERENCES users(id),
    revoked_reason        VARCHAR(300),

    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_status ON subscriptions (status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions (current_period_end);

-- ----------------------------------------------------------------------------
-- ADMIN AUDIT LOG
-- Every grant/revoke/approval action taken by the super-admin.
-- ----------------------------------------------------------------------------

CREATE TABLE admin_audit_log (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id     UUID NOT NULL REFERENCES users(id),
    property_id  UUID REFERENCES properties(id),
    action       VARCHAR(60) NOT NULL,        -- 'approve_property','revoke_access','grant_access', ...
    notes        VARCHAR(500),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_property ON admin_audit_log (property_id);

-- ----------------------------------------------------------------------------
-- CONVENIENCE VIEW — what the public discovery feed actually queries
-- ----------------------------------------------------------------------------

CREATE VIEW public_property_listings AS
SELECT
    p.id,
    p.type,
    p.name,
    p.slug,
    p.tagline,
    p.city,
    p.country_code,
    p.lat,
    p.lng,
    p.contact_phone,
    COALESCE(p.whatsapp_phone, p.contact_phone) AS whatsapp_phone,
    p.star_rating,
    MIN(i.price_per_night)  AS from_price,
    i.currency,
    EXISTS (
        SELECT 1 FROM offers o
        WHERE o.property_id = p.id AND CURRENT_DATE BETWEEN o.valid_from AND o.valid_to
    ) AS has_active_offer,
    EXISTS (
        SELECT 1 FROM offers o
        WHERE o.property_id = p.id AND o.is_premium
          AND CURRENT_DATE BETWEEN o.valid_from AND o.valid_to
    ) AS has_premium_offer,
    (SELECT url FROM media m WHERE m.property_id = p.id AND m.is_cover LIMIT 1) AS cover_image_url
FROM properties p
JOIN inventory i ON i.property_id = p.id AND i.is_active AND i.quantity_available > 0
JOIN subscriptions s ON s.property_id = p.id AND s.status = 'active'
WHERE p.status = 'active'
GROUP BY p.id, i.currency;

-- ----------------------------------------------------------------------------
-- Haversine fallback (only needed if PostGIS is unavailable on your host).
-- Distance in kilometers between two lat/lng pairs.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION haversine_km(
    lat1 DOUBLE PRECISION, lng1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION, lng2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    r         CONSTANT DOUBLE PRECISION := 6371; -- Earth radius, km
    d_lat     DOUBLE PRECISION := radians(lat2 - lat1);
    d_lng     DOUBLE PRECISION := radians(lng2 - lng1);
    a         DOUBLE PRECISION;
BEGIN
    a := sin(d_lat / 2) ^ 2 +
         cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lng / 2) ^ 2;
    RETURN r * 2 * asin(sqrt(a));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Example "nearest N" query using PostGIS (preferred — uses the GIST index):
--
-- SELECT *, ST_Distance(location, ST_MakePoint(:lng, :lat)::geography) / 1000 AS distance_km
-- FROM public_property_listings pl
-- JOIN properties p ON p.id = pl.id
-- ORDER BY location <-> ST_MakePoint(:lng, :lat)::geography
-- LIMIT 20;
