# Bed-Stuy 2125

A speculative design project: neighbors imagine buildings for Bed-Stuy in 2125, and AI renders them.

- `client/` is the static site (Render static site).
- `server/` is the Express API (Render web service). It uses OpenAI for text and images, Cloudinary for image storage, and Neon Postgres for data.

## Site-specific renderings

Each physical site has a QR code that opens `/s/<slug>`. There, people take the regular survey with the location locked to that site, and get an AI edit of the site's real photo. Only the masked area changes; everything else in the photo stays untouched. Their renderings appear in the gallery under **Sites → <site name>** (`/gallery.html?site=<slug>`), as well as in **All**.

One-time setup (already done for the pilot):

- Run `server/db/001_sites.sql` once in Neon's SQL Editor.
- In the Render static site's **Redirects/Rewrites** settings, add a rule from `/s/*` to `/site.html` with the action **Rewrite**.

### How to add a new site

1. **Photo.** Take a straight-on, landscape photo of the site. Use your own photo, not a Street View capture. Save it as `client/images/sites/<slug>.png` (or `.jpg`). The slug is short and lowercase, e.g. `412-tompkins`.

2. **Mask (optional, but recommended).** Make a PNG the exact same size as the photo. Make it **transparent** where the AI may build (the lot, and the sky above it if the building can rise), and **opaque** everywhere that must stay as-is (neighboring buildings, poles, the sidewalk, the street). Save it as `client/images/sites/<slug>-mask.png`. Without a mask, the AI may change the whole photo.

3. **Deploy the client** (commit and push) so the photo and mask are live at their public URLs.

4. **Add the database row** in Neon's SQL Editor:

   ```sql
   INSERT INTO sites (slug, name, address, photo_url, mask_url, context)
   VALUES (
     '<slug>',
     '<Display name, e.g. 412 Tompkins Ave>',
     '<Full address, e.g. 412 Tompkins Ave, Brooklyn, NY>',
     '/images/sites/<slug>.png',
     '/images/sites/<slug>-mask.png',
     '<One or two sentences describing the photo: what is on the lot, and what is to the left, behind, and to the right.>'
   );
   ```

   Use paths starting with `/images/`, not full URLs, so the row works on every domain the site is served from.

   The site immediately shows up in the gallery's **Sites** filter. To take a site offline, run `UPDATE sites SET active = false WHERE slug = '<slug>';`.

5. **Generate the QR code** (needs Python with `pip3 install segno`):

   ```bash
   python3 qr/make_qr.py <slug>
   ```

   This writes `qr/<slug>.svg` and `qr/<slug>.png`, pointing to `https://bedstuy2125.org/s/<slug>`. To use a different domain, run it with `PUBLIC_BASE_URL=https://example.org` in front.

   Print it at least 7 cm (about 3 in) wide, and keep the white border around it.

6. **Test it.** Scan the code with your phone and submit one rendering.

If you replace a site's photo or mask, give the new file a **new name** and update the row's path. The API caches site images in memory, so reusing the same URL keeps serving the old file until the server restarts.

### Reviewing site suggestions

Neighbors can suggest new sites at `/suggest.html`, which is linked from the homepage and every site page. Suggestions are private and never appear on the site. One-time setup: run `server/db/003_site_suggestions.sql` in Neon's SQL Editor.

To read them, run this in Neon's SQL Editor:

```sql
SELECT id, created_at, location, current_use, why, photo_public_id,
       CASE WHEN credit_ok THEN first_name || COALESCE(' ' || last_initial || '.', '') END AS credit_as,
       first_name, last_initial, status
FROM site_suggestions ORDER BY created_at DESC;
```

- **Reference photos** are private (Cloudinary "authenticated" assets). Open Cloudinary → **Media Library** → folder `bedstuy-2125/suggestions`, and match a photo to its row with `photo_public_id`. Photos are resized and have location data removed before upload.
- **Credit:** `credit_as` is filled in only when the person opted in, e.g. `Jordan K.`. Use it as "Suggested by Jordan K." when that site goes live.
- **Tracking:** mark progress with `UPDATE site_suggestions SET status = 'photographed' WHERE id = <id>;` (or `'live'`, `'passed'`).

### Environment variables (API service on Render)

| Variable | Default | Purpose |
|---|---|---|
| `OPENAI_API_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `DATABASE_URL` | none | Existing service credentials |
| `PUBLIC_BASE_URL` | `https://bedstuy2125.org` | The site's public address. The API uses it to fetch site photos and masks, and it's the domain QR codes should point to |
| `CLIENT_ORIGIN` | none | Extra browser origins allowed to call the API, comma-separated. `bedstuy2125.org`, `www.bedstuy2125.org`, and the onrender client address are always allowed |
| `DAILY_GENERATION_CAP` | `50` | Max renderings saved per day (UTC), all flows combined |
| `RATE_LIMIT_MAX` | `3` | Submissions allowed per IP per window |
| `RATE_LIMIT_WINDOW_MINUTES` | `15` | Length of that window |
| `IMAGE_QUALITY` | `high` | `high`, `medium`, or `low` for site renderings (trades quality for cost) |
| `SUGGEST_RATE_LIMIT_MAX` | `5` | Site suggestions allowed per IP per window |
| `SUGGEST_RATE_LIMIT_WINDOW_MINUTES` | `60` | Length of that window |

### Moderation

Moderation is deferred for the pilot, so every rendering publishes immediately. Every row has a `status` column, and the gallery only shows `published` rows. To add an approval step later, have the server insert `pending` (see the TODO in `server/server.js`) and add a way to flip rows to `published`. No migration is needed.
