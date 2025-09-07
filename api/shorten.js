// Simple in-memory storage (will reset on deployment, but works for demo)
const urlMap = new Map();
let counter = 1000;

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'POST') {
    // Create short URL
    const { longUrl } = req.body;
    const shortId = (counter++).toString(36);
    
    urlMap.set(shortId, longUrl);
    
    res.status(200).json({ 
      shortUrl: `https://minnebo.ai/s/${shortId}`,
      shortId 
    });
  } else if (req.method === 'GET') {
    // Redirect from short URL
    const { id } = req.query;
    const longUrl = urlMap.get(id);
    
    if (longUrl) {
      res.writeHead(302, { Location: longUrl });
      res.end();
    } else {
      res.writeHead(302, { Location: 'https://minnebo.ai' });
      res.end();
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}