require ('dotenv').config();
const express = require ('express');
const app = express ();
const port = process.env.PORT || 3000;
const {Pool} = require('pg');
const cors = require('cors');
const OpenAI = require("openai");
const cloudinary = require('cloudinary').v2;

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
app.use(cors( {
  origin: 'https://bedstuy-2125-virtual-client.onrender.com'
}));
app.use(express.json());

// routes
app.get ('/', (req, res) => {
    res.send ('Hello World! Your server is running!');
});

// POST route - submit a building with AI; used Claude and Gemini for this
app.post('/submit-building', async (req, res) => {
  try {
    //Get user data
    const { name, address, year, describe, vibe, user_name, user_location } = req.body;
    console.log(`Generating AI description for: ${name}...`);
    
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

    const aiDescription = completion.choices[0].message.content;

    // AI image generation
    const imageResponse = await openai.images.generate ({
      model: "dall-e-3",
      prompt: `Editorial architectural photograph of a building at ${address} in Bed-Stuy, Brooklyn, year ${year}. ${aiDescription}. Street-level, eye-level view from across the street, shot on a 35mm tilt-shift lens, soft overcast daylight, natural muted color, subtle film grain, realistic perspective and depth of field. Show the building in its real context: whatever actually sits on and around that block — neighboring buildings of varying types and eras, street trees, parked cars, sidewalk, utility poles, ordinary signage, a few neighbors passing by. Where it fits the site, the architecture can echo classic Bed-Stuy cues — brownstone and red-brick facades, tall parlor windows, cornices, bay fronts, stoops — as touchstones rather than requirements, updated with inventive sustainable materials, greenery, and shared exterior space. Design language draws on Afrofuturist artists and designers such as Olalekan Jeyifous, Ari Melenciano, and Tabita Rezaire: warm, human, grounded, built by and for the community. Lived-in and slightly weathered rather than pristine. Documentary style, as if published in a print architecture magazine. Avoid sci-fi tropes, glowing lights, floating elements, glossy CGI, and dystopian mood.`, 
      n: 1,
      size: "1024x1024"
    });

    const tempImageUrl = imageResponse.data[0].url;
    console.log ('AI image generated (temporary URL)');

    // Upload to Cloudinary for permanent storage 
    const uploadResult = await cloudinary.uploader.upload(tempImageUrl, {
      folder: 'bedstuy-2125',
      transformation: [
        {width: 1024, height: 1024, crop: 'limit'}
      ]
    });  

    const permanentImageUrl = uploadResult.secure_url;
    console.log ('image uploaded to Cloudinary (permanent URL');

    // save to database with permanent image URL 
    const result = await pool.query(
      'INSERT INTO buildings (name, address, year, describe, vibe, user_name, user_location, ai_description, ai_image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, address, year, describe, vibe, user_name, user_location, aiDescription, permanentImageUrl]
    );

    console.log('building saved to database with permanent image');
    res.json(result.rows[0]);

    } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during submission' });
  }
});


// GET route - get all buildings; used Claude for this
app.get('/get-buildings', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM buildings ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen (port, () => {
    console.log ('server is running on port ${port}');
});




