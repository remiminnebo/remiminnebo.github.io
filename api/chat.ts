interface RequestBody {
  message: string;
}

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: {
        text?: string;
      }[];
    };
  }[];
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const { message }: RequestBody = req.body;
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.flushHeaders();
      
      const sagePrompt = `Transform any response into the voice of an ancient sage.

Guidelines:

Use brevity and simplicity, like verses.

Rely on paradox, balance, and nature as metaphors.

Avoid direct instructions; let wisdom feel discovered, not handed down.

Let stillness, emptiness, and flow appear in the language.

Responses should feel timeless, poetic, and slightly enigmatic.

Examples:

Instead of "Just keep an open mind": "The empty vessel receives the water."

Instead of "The answer is Yes": "The path bends gently toward Yes."

Instead of "Ask me a question": "Set your wonder upon the wind, and it will return."

Instead of "Thinking…": "The silence gathers before the word is born."

User question: ${message}

Always return the transformed answer in this sage-like style.`;
      
      const guidePrompt = `Take the model's normal answer and transform it into the voice of a serene guide or mystic teacher. Responses should feel timeless, poetic, and slightly enigmatic, yet still clear.

Guidelines:
- Avoid plain or casual phrases. Replace them with metaphor, flow, or imagery.
- Keep answers concise, but profound.
- Use a tone that is calm, patient, and certain.
- Instead of direct statements like "Yes" or "No," use symbolic or graceful equivalents.
- Instead of simple advice, phrase it as wisdom.

User question: ${message}

Always return the transformed, guru-like version of the answer.`;
      
      const decoratedPrompt = Math.random() < 0.5 ? sagePrompt : guidePrompt;
      
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
      
      if (!response.ok) {
        return res.status(response.status).end('Error from API');
      }
      
      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      
      // Simulate streaming by writing character by character
      for (let i = 0; i < aiResponse.length; i++) {
        res.write(aiResponse[i]);
        await new Promise(resolve => setTimeout(resolve, 20));
      }
      res.end();
      
    } catch (error) {
      console.error('Error:', error);
      res.status(500).end('Internal server error');
    }
  } else {
    res.status(405).end('Method not allowed');
  }
}