const conversations = new Map();

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'POST') {
    // Store conversation
    const { question, answer } = req.body;
    const id = Math.random().toString(36).substring(2, 15);
    
    conversations.set(id, { question, answer, timestamp: Date.now() });
    
    res.status(200).json({ id });
  } else if (req.method === 'GET') {
    // Retrieve conversation
    const { id } = req.query;
    const conversation = conversations.get(id);
    
    if (conversation) {
      res.status(200).json(conversation);
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}