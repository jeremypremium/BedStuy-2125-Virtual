require ('dotenv').config();
const express = require ('express');
const app = express ();
const port = process.env.PORT || 3000;
const {Pool} = require('pg');
const cors = require('cors');
const OpenAI = require("openai");

// OpenAI connection
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, 
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
    const prompt = `You are an architectural historian from the year ${year} in Bed-Stuy, Brooklyn. 
    A new building called "${name}" was just built at ${address}. 
    The creator describes it as: "${describe}" with a vibe of "${vibe}".
    Write a 2-3 sentence description of this building as if you're documenting it for future generations.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", 
      messages: [
          { role: "system", content: "You are an architectural historian from the future." },
          { role: "user", content: prompt }
      ],
    });

    const aiDescription = completion.choices[0].message.content;

    // AI image generation
    const imageResponse = await openai.images.generate ({
      model: "dall-e-3",
      prompt: `A futuristic building in Bed-Stuy, Brooklyn in the year ${year}. ${aiDescription}`,
      n: 1,
      size: "1024x1024"
    });

    const imageUrl = imageResponse.data[0].url;

    // INSERT INTO DATABASE (Added ai_description and ai_image_url columns)
    const result = await pool.query(
      'INSERT INTO buildings (name, address, year, describe, vibe, user_name, user_location, ai_description, ai_image_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [name, address, year, describe, vibe, user_name, user_location, aiDescription, imageUrl]
    );

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




