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
    const prompt = `
      Describe a futuristic building named "${name}" located at ${address}. 
      It was built in the year ${year}. 
      The user describes it as: "${describe}".
      The vibe is: "${vibe}".
      Write a creative architectural description (max 100 words).
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use this standard, fast model
      messages: [
          { role: "system", content: "You are an architectural historian from the future." },
          { role: "user", content: prompt }
      ],
    });

    const aiDescription = completion.choices[0].message.content;

    // 3. INSERT INTO DATABASE (Added ai_description column)
    const result = await pool.query(
      'INSERT INTO buildings (name, address, year, describe, vibe, user_name, user_location, ai_description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [name, address, year, describe, vibe, user_name, user_location, aiDescription]
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




