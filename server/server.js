require ('dotenv').config();
const express = require ('express');
const app = express ();
const port = process.env.PORT || 3000;
const {Pool} = require('pg');
const cors = require('cors');
const OpenAI = require("openai");
const { toFile } = require("openai");
const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');

// The public site's canonical address: used for QR codes and to resolve site photo paths.
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://bedstuy2125.org').replace(/\/+$/, '');
// Browsers allowed to call this API. CLIENT_ORIGIN adds extra origins (comma-separated)
// on top of these, so setting it can never lock out the main domains.
const CLIENT_ORIGINS = [...new Set([
  PUBLIC_BASE_URL,
  'https://bedstuy2125.org',
  'https://www.bedstuy2125.org',
  'https://bedstuy-2125-virtual-client.onrender.com',
  ...(process.env.CLIENT_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean),
])];
const DAILY_GENERATION_CAP = Number(process.env.DAILY_GENERATION_CAP || 50);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 3);
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15) * 60 * 1000;
const SUGGEST_RATE_LIMIT_MAX = Number(process.env.SUGGEST_RATE_LIMIT_MAX || 5);
const SUGGEST_RATE_LIMIT_WINDOW_MS = Number(process.env.SUGGEST_RATE_LIMIT_WINDOW_MINUTES || 60) * 60 * 1000;
const IMAGE_QUALITY = process.env.IMAGE_QUALITY || 'high';

// OpenAI connection
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// database connection
const pool = new Pool ({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized:false
    }
})

// Middleware
// Render sits behind a proxy; this makes req.ip the visitor's IP for rate limiting.
app.set('trust proxy', 1);
app.use(cors( {
  origin: CLIENT_ORIGINS
}));

// Per-IP rate limit, in memory (fine for a single Render instance).
function createRateLimit(max, windowMs, message) {
  const recentByIp = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const recent = (recentByIp.get(req.ip) || []).filter(time => now - time < windowMs);
    if (recent.length >= max) {
      return res.status(429).json({ error: message });
    }
    recent.push(now);
    recentByIp.set(req.ip, recent);
    next();
  };
}

const rateLimit = createRateLimit(RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS,
  "You've made a few renderings in a row. Take a breather and try again in a few minutes.");
const suggestRateLimit = createRateLimit(SUGGEST_RATE_LIMIT_MAX, SUGGEST_RATE_LIMIT_WINDOW_MS,
  "Thanks for all the suggestions! Please try again in a little while.");

function cleanText(value, maxLength) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text.slice(0, maxLength) : null;
}

// Registered before the global JSON parser so only this route accepts a photo-sized body.
app.post('/suggest-site', express.json({ limit: '6mb' }), suggestRateLimit, async (req, res) => {
  try {
    const { website, photo, photo_consent } = req.body;
    // Honeypot: people never see this field, so anything in it is a bot.
    if (website) return res.json({ ok: true });

    const location = cleanText(req.body.location, 200);
    if (!location) return res.status(400).json({ error: 'Please tell us where the site is.' });

    const firstName = cleanText(req.body.first_name, 60);
    const lastInitial = cleanText(req.body.last_initial, 10);
    const initial = lastInitial ? lastInitial.replace(/[^\p{L}]/gu, '').slice(0, 1).toUpperCase() || null : null;

    let photoPublicId = null;
    if (photo) {
      if (typeof photo !== 'string' || !photo.startsWith('data:image/jpeg;base64,')) {
        return res.status(400).json({ error: "We couldn't read that photo. Please try a different one." });
      }
      if (!photo_consent) {
        return res.status(400).json({ error: 'Please confirm the photo is yours before sending.' });
      }
      // 'authenticated' assets have no public URL; view them in Cloudinary's Media Library.
      const upload = await cloudinary.uploader.upload(photo, {
        folder: 'bedstuy-2125/suggestions',
        type: 'authenticated',
      });
      photoPublicId = upload.public_id;
    }

    await pool.query(
      `INSERT INTO site_suggestions
        (location, current_use, why, photo_public_id, first_name, last_initial, credit_ok)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [location, cleanText(req.body.current_use, 300), cleanText(req.body.why, 600), photoPublicId,
       firstName, initial, Boolean(firstName && req.body.credit_ok)]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong sending your suggestion.' });
  }
});

app.use(express.json());

async function underDailyCap() {
  const result = await pool.query(
    "SELECT COUNT(*)::int AS count FROM buildings WHERE created_at >= date_trunc('day', now())"
  );
  return result.rows[0].count < DAILY_GENERATION_CAP;
}

async function findActiveSite(slug) {
  const result = await pool.query('SELECT * FROM sites WHERE slug = $1 AND active = true', [slug]);
  return result.rows[0] || null;
}

async function writeDescription({ year, name, address, describe, vibe }) {
  //Generate AI text; create a prompt based on user input
  const prompt = `You are a Black architectural historian from the year ${year} with expertise of the Bed-Stuy, Brooklyn neighborhood.
    A new building called "${name}" was just built at ${address}.
    The creator describes it as: "${describe}" with a vibe of "${vibe}".
    Write a 2-3 sentence description of this building as if you're documenting it for future generations.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
        { role: "system", content: "You are a Black architectural historian from the future, with expertise in the Bed Stuy, Brooklyn neighborhood." },
        { role: "user", content: prompt }
    ],
  });

  return completion.choices[0].message.content;
}

function buildStandalonePrompt({ year, address }, aiDescription) {
  return `Editorial architectural photograph of a building at ${address} in Bed-Stuy, Brooklyn, year ${year}. ${aiDescription}. Street-level, eye-level view from across the street, shot on a 35mm tilt-shift lens, soft overcast daylight, natural muted color, subtle film grain, realistic perspective and depth of field. Show the building in its real context: whatever actually sits on and around that block — neighboring buildings of varying types and eras, street trees, parked cars, sidewalk, utility poles, ordinary signage, a few neighbors passing by. Where it fits the site, the architecture can echo classic Bed-Stuy cues — brownstone and red-brick facades, tall parlor windows, cornices, bay fronts, stoops — as touchstones rather than requirements, updated with inventive sustainable materials, greenery, and shared exterior space. Design language draws on Afrofuturist artists and designers such as Olalekan Jeyifous, Ari Melenciano, and Tabita Rezaire: warm, human, grounded, built by and for the community. Lived-in and slightly weathered rather than pristine. Documentary style, as if published in a print architecture magazine. Avoid sci-fi tropes, glowing lights, floating elements, glossy CGI, and dystopian mood.`;
}

function buildSitePrompt(site, { year, name, describe, vibe }, aiDescription) {
  return [
    `Edit this photo. ${site.context}`,
    `In the editable area, show what this site has become: a new place called "${name}". The creator describes it as: ${describe}. It looks like: ${vibe}.`,
    `Historian's note: ${aiDescription}`,
    'Keep everything outside the editable area exactly as it is in the photo.',
    `photorealistic, same camera angle, perspective and lighting as the original photo, Bed-Stuy, Brooklyn in the year ${year || 2125}, hopeful, green, community-built.`,
  ].join('\n');
}

async function renderStandalone(prompt) {
  const imageResponse = await openai.images.generate ({
    model: "gpt-image-1",
    prompt,
    n: 1,
    size: "1024x1024",
    quality: "high"
  });
  return Buffer.from(imageResponse.data[0].b64_json, 'base64');
}

// Site photos and masks are static files on the client site; cache them per server process.
const assetCache = new Map();

// Site rows store photo/mask paths like /images/sites/x.jpg, so they work on any domain.
// Full URLs (older rows) are used as-is.
function absoluteAssetUrl(pathOrUrl) {
  return pathOrUrl ? new URL(pathOrUrl, `${PUBLIC_BASE_URL}/`).href : null;
}

async function fetchAsset(url) {
  if (!assetCache.has(url)) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Could not fetch ${url}: ${response.status}`);
    assetCache.set(url, Buffer.from(await response.arrayBuffer()));
  }
  return assetCache.get(url);
}

// gpt-image-1 only edits at fixed sizes, so the photo is fitted inside one and the gap is
// filled by mirroring (and locked by the mask). The result is cropped back to the photo's
// aspect ratio, then pasted onto the original photo through the mask so that everything
// outside the editable area stays photographically identical.
async function renderOnSite(site, prompt) {
  const photo = await fetchAsset(absoluteAssetUrl(site.photo_url));
  const { width: photoWidth, height: photoHeight } = await sharp(photo).metadata();
  const canvasWidth = photoWidth >= photoHeight ? 1536 : 1024;
  const canvasHeight = photoWidth >= photoHeight ? 1024 : 1536;

  const scale = Math.min(canvasWidth / photoWidth, canvasHeight / photoHeight);
  const width = Math.round(photoWidth * scale);
  const height = Math.round(photoHeight * scale);
  const pad = {
    left: Math.floor((canvasWidth - width) / 2),
    top: Math.floor((canvasHeight - height) / 2),
  };
  pad.right = canvasWidth - width - pad.left;
  pad.bottom = canvasHeight - height - pad.top;

  const photoBand = await sharp(photo).removeAlpha().resize(width, height, { fit: 'fill' }).png().toBuffer();
  const photoCanvas = await sharp(photoBand).extend({ ...pad, extendWith: 'mirror' }).png().toBuffer();

  let maskBand = null;
  let maskCanvas = null;
  if (site.mask_url) {
    const mask = await fetchAsset(absoluteAssetUrl(site.mask_url));
    maskBand = await sharp(mask).ensureAlpha().resize(width, height, { fit: 'fill' }).png().toBuffer();
    maskCanvas = await sharp(maskBand)
      .extend({ ...pad, background: { r: 0, g: 0, b: 0, alpha: 1 } })
      .png().toBuffer();
  }

  const result = await openai.images.edit({
    model: 'gpt-image-1',
    image: await toFile(photoCanvas, 'site.png', { type: 'image/png' }),
    ...(maskCanvas && { mask: await toFile(maskCanvas, 'mask.png', { type: 'image/png' }) }),
    prompt,
    size: `${canvasWidth}x${canvasHeight}`,
    quality: IMAGE_QUALITY,
    input_fidelity: 'high',
  });

  const edited = Buffer.from(result.data[0].b64_json, 'base64');
  const editedBand = await sharp(edited)
    .resize(canvasWidth, canvasHeight, { fit: 'fill' })
    .extract({ left: pad.left, top: pad.top, width, height })
    .removeAlpha()
    .png().toBuffer();

  if (!maskBand) return editedBand;

  // Transparent in the mask = editable, so invert its alpha and feather the edge slightly.
  const editableAlpha = await sharp(maskBand).extractChannel('alpha').negate().blur(2).png().toBuffer();
  const editedLayer = await sharp(editedBand).joinChannel(editableAlpha).png().toBuffer();
  return sharp(photoBand).composite([{ input: editedLayer }]).png().toBuffer();
}

// routes
app.get ('/', (req, res) => {
    res.send ('Hello World! Your server is running!');
});

app.get('/sites', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT slug, name, address, photo_url FROM sites WHERE active = true ORDER BY created_at'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/sites/:slug', async (req, res) => {
  try {
    const site = await findActiveSite(req.params.slug);
    if (!site) return res.status(404).json({ error: 'Site not found' });
    const { slug, name, address, photo_url } = site;
    res.json({ slug, name, address, photo_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// POST route - submit a building with AI; used Claude and Gemini for this
app.post('/submit-building', rateLimit, async (req, res) => {
  try {
    if (!(await underDailyCap())) {
      return res.status(503).json({ error: "We've reached today's limit for new renderings. Please come back tomorrow." });
    }

    //Get user data
    const { name, year, describe, vibe, user_name, user_location, site: siteSlug } = req.body;
    let address = req.body.address;

    // Site submissions always use the site's own address, whatever the browser sent.
    let site = null;
    if (siteSlug) {
      site = await findActiveSite(siteSlug);
      if (!site) return res.status(404).json({ error: "This site isn't taking new renderings right now." });
      address = site.address;
    }

    console.log(`Generating AI description for: ${name}...`);
    const answers = { year, name, address, describe, vibe };
    const aiDescription = await writeDescription(answers);

    let finalPrompt;
    let imageBuffer;
    if (site) {
      finalPrompt = buildSitePrompt(site, answers, aiDescription);
      imageBuffer = await renderOnSite(site, finalPrompt);
    } else {
      finalPrompt = buildStandalonePrompt(answers, aiDescription);
      imageBuffer = await renderStandalone(finalPrompt);
    }
    console.log ('AI image generated');

    // Upload to Cloudinary for permanent storage
    const uploadResult = await cloudinary.uploader.upload(`data:image/png;base64,${imageBuffer.toString('base64')}`, site
      ? { folder: `bedstuy-2125/sites/${site.slug}` }
      : { folder: 'bedstuy-2125', transformation: [{width: 1024, height: 1024, crop: 'limit'}] }
    );

    const permanentImageUrl = uploadResult.secure_url;
    console.log ('image uploaded to Cloudinary (permanent URL)');

    // TODO: moderation is deferred for the pilot, so every rendering publishes immediately.
    // To add an approval step, insert 'pending' here and add an endpoint that flips it to
    // 'published'; the gallery already only shows published rows.
    const status = 'published';

    // save to database with permanent image URL
    const result = await pool.query(
      `INSERT INTO buildings
        (name, address, year, describe, vibe, user_name, user_location, ai_description, ai_image_url,
         site_id, final_prompt, base_photo_url, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [name, address, year, describe, vibe, user_name, user_location, aiDescription, permanentImageUrl,
       site ? site.id : null, finalPrompt, site ? absoluteAssetUrl(site.photo_url) : null, status]
    );

    console.log('building saved to database with permanent image');
    res.json({ ...result.rows[0], site_slug: site ? site.slug : null });

    } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during submission' });
  }
});


// GET route - get all buildings; used Claude for this
// Optional filters: ?site=<slug>, ?collection=community (no site) or ?collection=sites.
app.get('/get-buildings', async (req, res) => {
  try {
    const { site, collection } = req.query;
    const conditions = ["b.status = 'published'"];
    const params = [];

    if (site) {
      params.push(site);
      conditions.push(`s.slug = $${params.length}`);
    } else if (collection === 'community') {
      conditions.push('b.site_id IS NULL');
    } else if (collection === 'sites') {
      conditions.push('b.site_id IS NOT NULL');
    }

    const result = await pool.query(
      `SELECT b.*, s.slug AS site_slug, s.name AS site_name
       FROM buildings b LEFT JOIN sites s ON s.id = b.site_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY b.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen (port, () => {
    console.log ('server is running on port ${port}');
});
