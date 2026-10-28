-- Site-specific renderings. Safe to run more than once.

CREATE TABLE IF NOT EXISTS sites (
    id          SERIAL PRIMARY KEY,
    slug        TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    address     TEXT NOT NULL,
    photo_url   TEXT NOT NULL,
    mask_url    TEXT,
    context     TEXT NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP DEFAULT now()
);

-- Site submissions live in the existing buildings table so they show up in the main gallery.
-- status defaults to 'published'; moderation can later insert 'pending' without a migration.
ALTER TABLE buildings
    ADD COLUMN IF NOT EXISTS site_id        INTEGER REFERENCES sites(id),
    ADD COLUMN IF NOT EXISTS final_prompt   TEXT,
    ADD COLUMN IF NOT EXISTS base_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS status         TEXT NOT NULL DEFAULT 'published';

CREATE INDEX IF NOT EXISTS buildings_site_created_idx ON buildings (site_id, created_at DESC);

INSERT INTO sites (slug, name, address, photo_url, mask_url, context)
VALUES (
    '1111-myrtle',
    '1111 Myrtle Ave',
    '1111 Myrtle Ave, Brooklyn, NY',
    '/images/sites/1111-myrtle.png',
    '/images/sites/1111-myrtle-mask.png',
    'Street-level view of a vacant lot behind a long green plywood construction fence on Myrtle Avenue. To the left, an older brick apartment building with fire escapes; behind, a new white mid-rise apartment building with balconies; to the right, a tall painted brick wall with faded ghost signage.'
)
ON CONFLICT (slug) DO NOTHING;
