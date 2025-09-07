import { createHmac, randomUUID } from 'crypto';
import { isTorExitNode, extractRealIP, generateRequestFingerprint, detectTorBrowser } from './tor-detector.js';
import { checkGlobalRateLimit, checkFingerprintRateLimit, requestChallenge, verifyChallenge, hasValidBypass } from './challenge-limiter.js';

// Secure in-memory storage with cleanup
const shares = new Map();
const rateLimits = new Map();

// Environment validation - require 64+ char key for 256-bit entropy
const SECRET_KEY = process.env.SHARE_SECRET;
if (!SECRET_KEY || SECRET_KEY.length < 64) {
  throw new Error('SHARE_SECRET must be set and at least 64 characters long for cryptographic security');
}
// Validate key entropy - ReDoS-safe pattern check (limited backtracking)
if (/(.{4,8})\1/.test(SECRET_KEY.substring(0, 128))) {
  throw new Error('SHARE_SECRET contains repeated patterns - use cryptographically random key');
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

// Input validation and sanitization with Unicode protection
function validateAndSanitizeInput(question, answer) {
  if (!question || !answer) {
    throw new Error('Question and answer are required');
  }
  
  if (typeof question !== 'string' || typeof answer !== 'string') {
    throw new Error('Question and answer must be strings');
  }
  
  // Normalize Unicode
  const normalizedQuestion = question.normalize('NFKC');
  const normalizedAnswer = answer.normalize('NFKC');
  
  // Multi-layer validation for question
  const qCharLength = normalizedQuestion.length;
  const qByteLength = new TextEncoder().encode(normalizedQuestion).length;
  const qVisualLength = normalizedQuestion.replace(/[\u200b-\u200f\u2028-\u202f\u205f-\u206f\ufeff]/g, '').length;
  
  if (qCharLength > MAX_QUESTION_LENGTH) {
    throw new Error('Question exceeds maximum allowed length');
  }
  if (qByteLength > MAX_QUESTION_LENGTH * 4) {
    throw new Error('Question data too large');
  }
  if (qVisualLength < 1) {
    throw new Error('Question cannot be empty or invisible');
  }
  
  // Multi-layer validation for answer
  const aCharLength = normalizedAnswer.length;
  const aByteLength = new TextEncoder().encode(normalizedAnswer).length;
  const aVisualLength = normalizedAnswer.replace(/[\u200b-\u200f\u2028-\u202f\u205f-\u206f\ufeff]/g, '').length;
  
  if (aCharLength > MAX_ANSWER_LENGTH) {
    throw new Error('Answer exceeds maximum allowed length');
  }
  if (aByteLength > MAX_ANSWER_LENGTH * 4) {
    throw new Error('Answer data too large');
  }
  if (aVisualLength < 1) {
    throw new Error('Answer cannot be empty or invisible');
  }
  
  // Sanitize input (defense in depth) using normalized versions
  const sanitizedQuestion = sanitizeHtml(normalizedQuestion.trim());
  const sanitizedAnswer = sanitizeHtml(normalizedAnswer.trim());
  
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

// HMAC signature functions with full 256-bit security
function createSignature(data) {
  return createHmac('sha256', SECRET_KEY)
    .update(JSON.stringify(data))
    .digest('hex'); // Full 64-character hex = 256-bit security
}

function verifySignature(data, signature) {
  const expectedSignature = createSignature(data);
  
  // Timing-safe comparison without early returns
  let result = 0;
  const maxLength = Math.max(signature.length, expectedSignature.length);
  
  // Always compare the same number of characters to prevent timing attacks
  for (let i = 0; i < maxLength; i++) {
    const sigChar = i < signature.length ? signature.charCodeAt(i) : 0;
    const expectedChar = i < expectedSignature.length ? expectedSignature.charCodeAt(i) : 0;
    result |= sigChar ^ expectedChar;
  }
  
  // Also XOR the length difference to prevent length-based timing attacks
  result |= signature.length ^ expectedSignature.length;
  
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

// Advanced security checks
function performSecurityChecks(req) {
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

// Safe object destructuring to prevent prototype pollution
function safeExtract(obj, allowedKeys) {
  if (!obj || typeof obj !== 'object' || obj.constructor !== Object) {
    return {};
  }
  
  const result = {};
  for (const key of allowedKeys) {
    if (typeof key === 'string' && key !== '__proto__' && key !== 'constructor' && key !== 'prototype' && obj.hasOwnProperty(key)) {
      result[key] = obj[key];
    }
  }
  return result;
}

// Validate Host header to prevent DNS rebinding
function validateHost(req) {
  const host = req.headers.host;
  const allowedHosts = ['minnebo.ai', 'www.minnebo.ai', 'minnebo-ai.vercel.app'];
  
  if (!host || !allowedHosts.includes(host.toLowerCase())) {
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  // Validate Host header first
  if (!validateHost(req)) {
    return res.status(400).json({ error: 'Invalid host header' });
  }
  
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
    // Comprehensive security analysis
    const security = performSecurityChecks(req);
    
    if (req.method === 'POST') {
      // Block known Tor exit nodes for POST requests
      if (security.isTorExit) {
        console.log(`Blocked Tor exit node: ${security.realIP}`);
        return res.status(403).json({ error: 'Access denied: Anonymous networks not allowed for content creation' });
      }
      
      // Check global rate limits first
      const globalCheck = checkGlobalRateLimit();
      if (!globalCheck.allowed) {
        return res.status(429).json({ 
          error: 'Service overloaded. Please try again later.',
          retryAfter: Math.ceil(globalCheck.resetIn / 1000)
        });
      }
      
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
            return res.status(429).json({
              error: 'Rate limit exceeded. Too many failed challenges.',
              retryAfter: Math.ceil(fingerprintCheck.resetIn / 1000)
            });
          }
        }
      }
      
      // Safe extraction prevents prototype pollution
      const bodyData = safeExtract(req.body, ['question', 'answer', 'challengeId', 'challengeAnswer']);
      
      // Handle challenge verification if provided
      if (bodyData.challengeId && bodyData.challengeAnswer) {
        const challengeResult = verifyChallenge(bodyData.challengeId, bodyData.challengeAnswer, security.fingerprint);
        if (!challengeResult.valid) {
          return res.status(400).json({ 
            error: challengeResult.error,
            attemptsLeft: challengeResult.attemptsLeft
          });
        }
        // Challenge solved, continue with normal processing
      }
      
      const { question, answer } = bodyData;
      
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
      // Prevent parameter pollution - only accept single string values
      let id = req.query.id;
      
      // Reject arrays and non-string values
      if (Array.isArray(id)) {
        return res.status(400).json({ error: 'Invalid ID format - arrays not allowed' });
      }
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Valid ID is required' });
      }
      
      // Additional sanitization - remove any query fragments
      id = id.split('&')[0].split('#')[0].trim();
      
      // ATOMIC READ-CHECK-DELETE: Prevent TOCTOU race conditions
      const conversation = shares.get(id);
      
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Atomic operation: all validations BEFORE any modifications
      const { signature, ...data } = conversation;
      const now = Date.now();
      const isExpired = now - data.timestamp > MAX_AGE;
      const isValidSignature = verifySignature(data, signature);
      
      // SINGLE atomic delete decision based on all checks
      if (isExpired || !isValidSignature) {
        shares.delete(id);
        
        if (isExpired) {
          return res.status(404).json({ error: 'Conversation has expired' });
        } else {
          return res.status(400).json({ error: 'Invalid or tampered conversation' });
        }
      }
      
      // Only return data if ALL validations passed
      res.status(200).json(data);
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    // Safe logging - only log error type and message category
    console.error('Secure store error type:', error instanceof Error ? error.constructor.name : typeof error);
    
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
      // Safe logging - no sensitive data in logs
      console.error('Unexpected secure-store error type:', error instanceof Error ? error.constructor.name : typeof error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}