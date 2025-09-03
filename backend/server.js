const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

console.log('Starting server...');
console.log('PORT:', PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Simple CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Handle OPTIONS requests
app.options('*', (req, res) => {
  res.sendStatus(200);
});

// Body parser
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Backend is running!', port: PORT });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    // Use dynamic import for node-fetch
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: message
          }]
        }]
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }
    
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    res.json({ response: aiResponse });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server error:', err);
});