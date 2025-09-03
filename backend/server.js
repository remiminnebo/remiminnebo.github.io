const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

console.log('Starting server...');
console.log('PORT:', PORT);

// CORS - handle preflight
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    console.log('OPTIONS request received');
    return res.status(200).end();
  }
  
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'Backend is running!', port: PORT, env: process.env.NODE_ENV });
});

app.post('/api/chat', (req, res) => {
  console.log('Received chat request:', req.body);
  const { message } = req.body;
  res.json({ response: `Echo: ${message}` });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server error:', err);
});