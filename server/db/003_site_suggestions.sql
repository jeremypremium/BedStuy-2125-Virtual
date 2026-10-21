-- Private inbox for neighbors' site suggestions. Nothing here is shown on the site.

CREATE TABLE IF NOT EXISTS site_suggestions (
    id               SERIAL PRIMARY KEY,
    location         TEXT NOT NULL,
    current_use      TEXT,
    why              TEXT,
    photo_public_id  TEXT,
    first_name       TEXT,
    last_initial     TEXT,
    credit_ok        BOOLEAN NOT NULL DEFAULT false,
    status           TEXT NOT NULL DEFAULT 'new',
    created_at       TIMESTAMP DEFAULT now()
);
