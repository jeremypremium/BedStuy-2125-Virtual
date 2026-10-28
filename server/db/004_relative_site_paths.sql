-- Store site photo and mask locations as paths (e.g. /images/sites/x.jpg) instead of full
-- onrender URLs, so they work on bedstuy2125.org, www, and the onrender address alike.
-- Optional: the server already handles both forms. Safe to run more than once.

-- Only rewrites the site's own hosts, so a photo hosted elsewhere (e.g. Cloudinary) is left alone.
UPDATE sites
SET photo_url = regexp_replace(photo_url, '^https://(bedstuy-2125-virtual-client\.onrender\.com|(www\.)?bedstuy2125\.org)', ''),
    mask_url  = regexp_replace(mask_url,  '^https://(bedstuy-2125-virtual-client\.onrender\.com|(www\.)?bedstuy2125\.org)', '');
