import { createHmac, randomUUID } from 'crypto';

// Secure in-memory storage with cleanup
const shares = new Map();
const rateLimits = new Map();

// Environment validation
const SECRET_KEY = process.env.SHARE_SECRET;
if (!SECRET_KEY || SECRET_KEY.length < 32) {
  throw new Error('SHARE_SECRET must be set and at least 32 characters long');
}

// Security constants
const MAX_QUESTION_LENGTH = 500;
const MAX_ANSWER_LENGTH = 5000;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;
const CLEANUP_INTERVAL = 3600000; // 1 hour
const MAX_AGE = 86400000; // 24 hours

// Server-side HTML sanitization
function sanitizeHtml(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .replace(/[<>&"']/g, (match) => {
      const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
      return entities[match] || match;
    })
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .trim();
}

// Input validation and sanitization
function validateAndSanitizeInput(question, answer) {
  if (!question || !answer) {
    throw new Error('Question and answer are required');
  }
  
  if (typeof question !== 'string' || typeof answer !== 'string') {
    throw new Error('Question and answer must be strings');
  }
  
  if (question.length > MAX_QUESTION_LENGTH) {
    throw new Error(`Question must be less than ${MAX_QUESTION_LENGTH} characters`);
  }
  
  if (answer.length > MAX_ANSWER_LENGTH) {
    throw new Error(`Answer must be less than ${MAX_ANSWER_LENGTH} characters`);
  }
  
  // Sanitize input (defense in depth)
  const sanitizedQuestion = sanitizeHtml(question.trim());
  const sanitizedAnswer = sanitizeHtml(answer.trim());
  
  if (!sanitizedQuestion || !sanitizedAnswer) {
    throw new Error('Question and answer cannot be empty after sanitization');
  }
  
  return { question: sanitizedQuestion, answer: sanitizedAnswer };
}

// Rate limiting
function checkRateLimit(clientId) {
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

// HMAC signature functions
function createSignature(data) {
  return createHmac('sha256', SECRET_KEY)
    .update(JSON.stringify(data))
    .digest('hex')
    .substring(0, 32);
}

function verifySignature(data, signature) {
  const expectedSignature = createSignature(data);
  // Use timing-safe comparison
  let result = 0;
  if (signature.length !== expectedSignature.length) {
    return false;
  }
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  return result === 0;
}

// Cleanup old entries
function cleanup() {
  const now = Date.now();
  for (const [id, conversation] of shares.entries()) {
    if (now - conversation.timestamp > MAX_AGE) {
      shares.delete(id);
    }
  }
  
  // Cleanup rate limits
  for (const [clientId, limits] of rateLimits.entries()) {
    if (now - limits.windowStart > RATE_LIMIT_WINDOW) {
      rateLimits.delete(clientId);
    }
  }
}

// Start cleanup interval
setInterval(cleanup, CLEANUP_INTERVAL);

// Get client identifier for rate limiting
function getClientId(req) {
  return req.headers['x-forwarded-for'] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress ||
         'unknown';
}

export default async function handler(req, res) {
  // Security headers
  res.setHeader('Access-Control-Allow-Origin', 'https://minnebo.ai');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const clientId = getClientId(req);
    
    if (req.method === 'POST') {
      // Rate limiting
      checkRateLimit(clientId);
      
      const { question, answer } = req.body;
      
      // Validate and sanitize input
      const sanitized = validateAndSanitizeInput(question, answer);
      
      // Create secure conversation data
      const data = {
        question: sanitized.question,
        answer: sanitized.answer,
        timestamp: Date.now()
      };
      
      // Create HMAC signature for tamper protection
      const signature = createSignature(data);
      
      // Generate cryptographically secure ID
      const id = randomUUID();
      
      // Store with signature
      shares.set(id, { ...data, signature });
      
      res.status(200).json({ id });
      
    } else if (req.method === 'GET') {
      const { id } = req.query;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Valid ID is required' });
      }
      
      const conversation = shares.get(id);
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Verify signature to ensure data hasn't been tampered with
      const { signature, ...data } = conversation;
      
      if (!verifySignature(data, signature)) {
        // Remove tampered data
        shares.delete(id);
        return res.status(400).json({ error: 'Invalid or tampered conversation' });
      }
      
      // Check if conversation has expired
      if (Date.now() - data.timestamp > MAX_AGE) {
        shares.delete(id);
        return res.status(404).json({ error: 'Conversation has expired' });
      }
      
      res.status(200).json(data);
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Secure store error:', error);
    
    if (error.message.includes('Rate limit exceeded')) {
      res.status(429).json({ error: error.message });
    } else if (error.message.includes('required') || 
               error.message.includes('must be') || 
               error.message.includes('cannot be') ||
               error.message.includes('characters') ||
               error.message.includes('strings') ||
               error.message.includes('after sanitization')) {
      res.status(400).json({ error: error.message });
    } else {
      console.error('Unexpected error in secure-store:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}