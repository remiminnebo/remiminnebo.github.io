export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { message } = req.body;
      
      const decoratedPrompt = `Take the model's normal answer and transform it into the voice of a serene guide or mystic teacher. Responses should feel timeless, poetic, and slightly enigmatic, yet still clear.

Guidelines:
- Avoid plain or casual phrases. Replace them with metaphor, flow, or imagery.
- Keep answers concise, but profound.
- Use a tone that is calm, patient, and certain.
- Instead of direct statements like "Yes" or "No," use symbolic or graceful equivalents.
- Instead of simple advice, phrase it as wisdom.

User question: ${message}

Always return the transformed, guru-like version of the answer.`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: decoratedPrompt
            }]
          }]
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        return res.status(400).json({ error: data.error.message });
      }
      
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      return res.json({ response: aiResponse });
      
    } catch (error) {
      console.error('Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}