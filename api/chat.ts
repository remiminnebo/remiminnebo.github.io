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

// Rate limiting storage
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute for chat

// Get client identifier for rate limiting
function getClientId(req: any) {
  return req.headers['x-forwarded-for'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'unknown';
}

// Rate limiting function
function checkRateLimit(clientId: string) {
  const now = Date.now();
  const clientLimits = rateLimits.get(clientId) || { count: 0, windowStart: now };
  
  // Reset window if expired
  if (now - clientLimits.windowStart > RATE_LIMIT_WINDOW) {
    clientLimits.count = 0;
    clientLimits.windowStart = now;
  }
  
  if (clientLimits.count >= RATE_LIMIT_MAX_REQUESTS) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  clientLimits.count++;
  rateLimits.set(clientId, clientLimits);
}

// Prompt injection protection
function sanitizePrompt(message: string): string {
  if (!message || typeof message !== 'string') {
    throw new Error('Invalid message format');
  }
  
  // Length validation
  if (message.length > 1000) {
    throw new Error('Message too long. Please keep under 1000 characters.');
  }
  
  // Remove potential prompt injection patterns
  const sanitized = message
    .replace(/ignore\s+previous\s+instructions/gi, '')
    .replace(/system\s*:/gi, '')
    .replace(/assistant\s*:/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/<\|.*?\|>/gi, '')
    .replace(/###\s*(instruction|system|prompt)/gi, '')
    .trim();
    
  if (!sanitized) {
    throw new Error('Message cannot be empty after sanitization');
  }
  
  return sanitized;
}

export default async function handler(req: any, res: any) {
  // Secure CORS policy
  res.setHeader('Access-Control-Allow-Origin', 'https://minnebo.ai');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const clientId = getClientId(req);
      
      // Apply rate limiting
      checkRateLimit(clientId);
      
      const { message }: RequestBody = req.body;
      
      // Sanitize and validate the message
      const sanitizedMessage = sanitizePrompt(message);
      
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

User question: ${sanitizedMessage}

Always return the transformed answer in this sage-like style.`;
      
      const guidePrompt = `Take the model's normal answer and transform it into the voice of a serene guide or mystic teacher. Responses should feel timeless, poetic, and slightly enigmatic, yet still clear.

Guidelines:
- Avoid plain or casual phrases. Replace them with metaphor, flow, or imagery.
- Keep answers concise, but profound.
- Use a tone that is calm, patient, and certain.
- Instead of direct statements like "Yes" or "No," use symbolic or graceful equivalents.
- Instead of simple advice, phrase it as wisdom.

User question: ${sanitizedMessage}

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
        console.error('Gemini API error:', response.status, response.statusText);
        return res.status(500).end('AI service temporarily unavailable');
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
      console.error('Chat API error:', error);
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Rate limit exceeded')) {
          return res.status(429).end('Rate limit exceeded. Please try again later.');
        } else if (error.message.includes('Message too long') || 
                   error.message.includes('Invalid message') ||
                   error.message.includes('empty after sanitization')) {
          return res.status(400).end(error.message);
        }
      }
      
      res.status(500).end('Internal server error');
    }
  } else {
    res.status(405).end('Method not allowed');
  }
}