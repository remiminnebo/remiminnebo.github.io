// Advanced Challenge-Response Rate Limiting
import { createHash, randomBytes, createHmac } from 'crypto';

// Global rate limiting storage
const globalRequests = new Map(); // timestamp -> count
const challengeStore = new Map(); // challengeId -> {created, solved, attempts, fingerprint}
const fingerprintLimits = new Map(); // fingerprint -> {count, windowStart, challenges}

// Rate limiting constants
const GLOBAL_RATE_LIMIT = 1000; // requests per minute globally
const GLOBAL_WINDOW = 60000; // 1 minute
const FINGERPRINT_LIMIT = 5; // requests per fingerprint per minute
const CHALLENGE_TTL = 300000; // 5 minutes
const CHALLENGE_MAX_ATTEMPTS = 3;
const CLEANUP_INTERVAL = 300000; // 5 minutes

// Challenge secret key
const CHALLENGE_SECRET = process.env.CHALLENGE_SECRET || 'default-challenge-key-change-me';

// Simple mathematical challenge generation
function generateChallenge() {
  const operations = ['+', '-', '*'];
  const op = operations[Math.floor(Math.random() * operations.length)];
  
  let a, b, answer;
  
  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 50) + 25;
      b = Math.floor(Math.random() * 25) + 1;
      answer = a - b;
      break;
    case '*':
      a = Math.floor(Math.random() * 12) + 1;
      b = Math.floor(Math.random() * 12) + 1;
      answer = a * b;
      break;
  }
  
  const challengeId = randomBytes(16).toString('hex');
  const question = `${a} ${op} ${b}`;
  
  // Store challenge with HMAC protection
  const challengeData = {
    created: Date.now(),
    solved: false,
    attempts: 0,
    answer: answer,
    hmac: createHmac('sha256', CHALLENGE_SECRET).update(`${challengeId}:${answer}`).digest('hex')
  };
  
  challengeStore.set(challengeId, challengeData);
  
  return {
    challengeId,
    question,
    expiresIn: CHALLENGE_TTL
  };
}

// Verify challenge solution
function verifyChallenge(challengeId, providedAnswer, fingerprint) {
  const challenge = challengeStore.get(challengeId);
  
  if (!challenge) {
    return { valid: false, error: 'Challenge not found or expired' };
  }
  
  if (Date.now() - challenge.created > CHALLENGE_TTL) {
    challengeStore.delete(challengeId);
    return { valid: false, error: 'Challenge expired' };
  }
  
  if (challenge.solved) {
    return { valid: false, error: 'Challenge already solved' };
  }
  
  challenge.attempts++;
  
  if (challenge.attempts > CHALLENGE_MAX_ATTEMPTS) {
    challengeStore.delete(challengeId);
    return { valid: false, error: 'Too many attempts' };
  }
  
  // Verify HMAC to prevent tampering
  const expectedHmac = createHmac('sha256', CHALLENGE_SECRET).update(`${challengeId}:${challenge.answer}`).digest('hex');
  if (challenge.hmac !== expectedHmac) {
    challengeStore.delete(challengeId);
    return { valid: false, error: 'Challenge corrupted' };
  }
  
  const answer = parseInt(providedAnswer, 10);
  
  if (isNaN(answer) || answer !== challenge.answer) {
    return { valid: false, error: 'Incorrect answer', attemptsLeft: CHALLENGE_MAX_ATTEMPTS - challenge.attempts };
  }
  
  // Mark as solved and grant temporary bypass
  challenge.solved = true;
  challenge.fingerprint = fingerprint;
  
  return { valid: true };
}

// Check if fingerprint has valid challenge bypass
function hasValidBypass(fingerprint) {
  const now = Date.now();
  
  for (const [challengeId, challenge] of challengeStore.entries()) {
    if (challenge.solved && 
        challenge.fingerprint === fingerprint && 
        now - challenge.created < CHALLENGE_TTL) {
      return true;
    }
  }
  return false;
}

// Global rate limiting check
function checkGlobalRateLimit() {
  const now = Date.now();
  const windowStart = now - GLOBAL_WINDOW;
  
  // Count requests in current window
  let requestCount = 0;
  for (const [timestamp, count] of globalRequests.entries()) {
    if (timestamp >= windowStart) {
      requestCount += count;
    }
  }
  
  if (requestCount >= GLOBAL_RATE_LIMIT) {
    return { allowed: false, resetIn: GLOBAL_WINDOW - (now % GLOBAL_WINDOW) };
  }
  
  // Record this request
  const timeSlot = Math.floor(now / 1000) * 1000; // Round to nearest second
  globalRequests.set(timeSlot, (globalRequests.get(timeSlot) || 0) + 1);
  
  return { allowed: true };
}

// Fingerprint-based rate limiting
function checkFingerprintRateLimit(fingerprint) {
  const now = Date.now();
  const fingerprintData = fingerprintLimits.get(fingerprint) || { 
    count: 0, 
    windowStart: now,
    challenges: 0
  };
  
  // Reset window if expired
  if (now - fingerprintData.windowStart > GLOBAL_WINDOW) {
    fingerprintData.count = 0;
    fingerprintData.windowStart = now;
    fingerprintData.challenges = 0;
  }
  
  if (fingerprintData.count >= FINGERPRINT_LIMIT) {
    return { 
      allowed: false, 
      needsChallenge: fingerprintData.challenges < 3, // Allow up to 3 challenges per window
      resetIn: GLOBAL_WINDOW - (now - fingerprintData.windowStart)
    };
  }
  
  fingerprintData.count++;
  fingerprintLimits.set(fingerprint, fingerprintData);
  
  return { allowed: true };
}

// Request challenge for rate-limited fingerprint
function requestChallenge(fingerprint) {
  const fingerprintData = fingerprintLimits.get(fingerprint);
  if (fingerprintData) {
    fingerprintData.challenges++;
  }
  
  return generateChallenge();
}

// Cleanup expired data
function cleanup() {
  const now = Date.now();
  const windowStart = now - GLOBAL_WINDOW;
  const challengeExpiry = now - CHALLENGE_TTL;
  
  // Clean global requests
  for (const [timestamp] of globalRequests.entries()) {
    if (timestamp < windowStart) {
      globalRequests.delete(timestamp);
    }
  }
  
  // Clean expired challenges
  for (const [challengeId, challenge] of challengeStore.entries()) {
    if (challenge.created < challengeExpiry) {
      challengeStore.delete(challengeId);
    }
  }
  
  // Clean old fingerprint data
  for (const [fingerprint, data] of fingerprintLimits.entries()) {
    if (now - data.windowStart > GLOBAL_WINDOW * 2) {
      fingerprintLimits.delete(fingerprint);
    }
  }
}

// Start cleanup interval
setInterval(cleanup, CLEANUP_INTERVAL);

export {
  checkGlobalRateLimit,
  checkFingerprintRateLimit,
  requestChallenge,
  verifyChallenge,
  hasValidBypass,
  cleanup
};