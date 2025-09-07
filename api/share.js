const conversations = new Map();

export default function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      // Store conversation
      const { question, answer } = req.body;
      
      if (!question || !answer) {
        return res.status(400).json({ error: 'Question and answer required' });
      }
      
      const id = Math.random().toString(36).substring(2, 15);
      conversations.set(id, { question, answer, timestamp: Date.now() });
      
      console.log('Stored conversation:', id);
      res.status(200).json({ id });
    } catch (error) {
      console.error('POST error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'GET') {
    try {
      // Retrieve conversation
      const { id } = req.query;
      const conversation = conversations.get(id);
      
      if (conversation) {
        res.status(200).json(conversation);
      } else {
        res.status(404).json({ error: 'Conversation not found' });
      }
    } catch (error) {
      console.error('GET error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}