import { isTorExitNode, extractRealIP, generateRequestFingerprint, detectTorBrowser } from './tor-detector.js';
import { checkGlobalRateLimit, checkFingerprintRateLimit, requestChallenge, verifyChallenge, hasValidBypass } from './challenge-limiter.js';

interface RequestBody {
  message: string;
  challengeId?: string;
  challengeAnswer?: string;
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

// Rate limiting storage with cleanup
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute for chat
const CLEANUP_INTERVAL = 3600000; // 1 hour cleanup

// Cleanup old rate limit entries
function cleanupRateLimits() {
  const now = Date.now();
  for (const [clientId, limits] of rateLimits.entries()) {
    if (now - limits.windowStart > RATE_LIMIT_WINDOW) {
      rateLimits.delete(clientId);
    }
  }
}

// Start cleanup interval
setInterval(cleanupRateLimits, CLEANUP_INTERVAL);

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

// Prompt injection protection with Unicode-safe validation
function sanitizePrompt(message: string): string {
  if (!message || typeof message !== 'string') {
    throw new Error('Invalid message format');
  }
  
  // Normalize Unicode to prevent bypasses
  const normalized = message.normalize('NFKC');
  
  // Multi-layer length validation
  const charLength = normalized.length;
  const byteLength = new TextEncoder().encode(normalized).length;
  const visualLength = normalized.replace(/[\u200b-\u200f\u2028-\u202f\u205f-\u206f\ufeff]/g, '').length;
  
  if (charLength > 1000) {
    throw new Error('Message too long. Please keep under 1000 characters.');
  }
  
  if (byteLength > 4000) {
    throw new Error('Message too large. Please reduce content size.');
  }
  
  if (visualLength < 1) {
    throw new Error('Message cannot be empty or invisible.');
  }
  
  // Remove potential prompt injection patterns - ReDoS-safe regex
  const sanitized = normalized
    .replace(/ignore[\s]{1,5}previous[\s]{1,5}instructions/gi, '') // Limit quantifier to prevent backtracking
    .replace(/system[\s]{0,3}:/gi, '')
    .replace(/assistant[\s]{0,3}:/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/\[\/INST\]/gi, '')
    .replace(/<\|[^|]{0,50}\|>/gi, '') // Limit length to prevent ReDoS
    .replace(/###[\s]{0,3}(instruction|system|prompt)/gi, '')
    .trim();
    
  if (!sanitized) {
    throw new Error('Message cannot be empty after sanitization');
  }
  
  return sanitized;
}

// Calculate Shannon entropy to detect bot/automated messages
function calculateEntropy(text: string): number {
  if (!text || text.length === 0) return 0;
  
  const freq: { [char: string]: number } = {};
  const len = text.length;
  
  // Count character frequencies
  for (const char of text) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  // Calculate entropy
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  
  return entropy;
}

// Validate Host header to prevent DNS rebinding
function validateHost(req: any): boolean {
  const host = req.headers.host;
  const allowedHosts = ['minnebo.ai', 'www.minnebo.ai', 'minnebo-ai.vercel.app'];
  
  if (!host || !allowedHosts.includes(host.toLowerCase())) {
    return false;
  }
  return true;
}

// Advanced security checks
function performSecurityChecks(req: any) {
  const realIP = extractRealIP(req);
  const fingerprint = generateRequestFingerprint(req);
  const torDetection = detectTorBrowser(req);
  const isTor = isTorExitNode(realIP);
  
  return {
    realIP,
    fingerprint,
    isTorExit: isTor,
    torBrowserScore: torDetection.score,
    suspiciousPatterns: isTor || torDetection.score >= 3
  };
}

export default async function handler(req: any, res: any) {
  // Validate Host header first
  if (!validateHost(req)) {
    return res.status(400).end('Invalid host header');
  }
  
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
      // Comprehensive security analysis
      const security = performSecurityChecks(req);
      
      // Check global rate limits first
      const globalCheck = checkGlobalRateLimit();
      if (!globalCheck.allowed) {
        return res.status(429).end(`Service overloaded. Retry in ${Math.ceil(globalCheck.resetIn / 1000)}s`);
      }
      
      // More restrictive for suspicious traffic
      const limit = security.suspiciousPatterns ? 2 : 5; // Reduce limit for suspicious patterns
      
      // Debug logging
      console.log(`Request from ${security.realIP}: Tor=${security.isTorExit}, Browser Score=${security.torBrowserScore}, Suspicious=${security.suspiciousPatterns}`);
      
      // Check fingerprint-based rate limiting
      const fingerprintCheck = checkFingerprintRateLimit(security.fingerprint);
      if (!fingerprintCheck.allowed) {
        // Check if user has valid bypass from solved challenge
        if (!hasValidBypass(security.fingerprint)) {
          if (fingerprintCheck.needsChallenge) {
            const challenge = requestChallenge(security.fingerprint);
            return res.status(429).json({
              error: 'Rate limit exceeded. Solve challenge to continue.',
              challenge: challenge,
              retryAfter: Math.ceil(fingerprintCheck.resetIn / 1000)
            });
          } else {
            return res.status(429).end(`Rate limit exceeded. Retry in ${Math.ceil(fingerprintCheck.resetIn / 1000)}s`);
          }
        }
      }
      
      // Safe extraction to prevent prototype pollution
      const body = req.body;
      if (!body || typeof body !== 'object' || body.constructor !== Object) {
        throw new Error('Invalid request body format');
      }
      
      // Handle challenge verification if provided
      if (body.challengeId && body.challengeAnswer) {
        const challengeResult = verifyChallenge(body.challengeId, body.challengeAnswer, security.fingerprint);
        if (!challengeResult.valid) {
          return res.status(400).json({ 
            error: challengeResult.error,
            attemptsLeft: challengeResult.attemptsLeft
          });
        }
        // Challenge solved, continue with normal processing
      }
      
      const message = body.hasOwnProperty('message') && 
                      body.message !== undefined && 
                      typeof body.message === 'string' ? body.message : '';
      
      if (!message) {
        throw new Error('Message field is required');
      }
      
      // Entropy-based bot detection (more lenient thresholds)
      const messageEntropy = calculateEntropy(message);
      const isVeryLowEntropy = messageEntropy < 1.5; // Only catch extremely repetitive
      const isVeryHighEntropy = messageEntropy > 5.5; // Only catch complete gibberish
      
      if ((isVeryLowEntropy || isVeryHighEntropy) && security.suspiciousPatterns) {
        console.log(`Blocked suspicious message entropy: ${messageEntropy} from ${security.realIP}`);
        return res.status(400).end('Message content appears automated or invalid');
      }
      
      // Log but don't block for debugging
      if (isVeryLowEntropy || isVeryHighEntropy) {
        console.log(`Warning: Suspicious entropy ${messageEntropy} from ${security.realIP} but allowing due to no other suspicious patterns`);
      }
      
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
        // Safe logging - no sensitive data
        console.error('Gemini API error - Status:', response.status);
        return res.status(500).end('AI service temporarily unavailable');
      }
      
      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
      
      // Send complete response immediately (no artificial streaming delay)
      res.end(aiResponse);
      
    } catch (error) {
      // Safe logging - only log error type, not full error object
      console.error('Chat API error type:', error instanceof Error ? error.constructor.name : typeof error);
      
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