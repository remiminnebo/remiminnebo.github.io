// Simple in-memory feedback store with basic rate limiting
const votesById = new Map(); // id -> { up: number, down: number }
const rateLimits = new Map(); // key -> { count, windowStart }

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests/minute per IP/fingerprint

function getAllowedHosts() {
  const env = process.env.ALLOWED_HOSTS;
  if (env && env.trim().length > 0) {
    return env.split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
  }
  return ['minnebo.ai', 'www.minnebo.ai', 'minnebo-ai.vercel.app', 'localhost:3000'];
}

function validateHost(req) {
  const host = (req.headers.host || '').toLowerCase();
  const allowedHosts = getAllowedHosts();
  return Boolean(host && allowedHosts.includes(host));
}

function getAllowedOrigin(req) {
  const origin = req.headers.origin;
  const allowed = (process.env.ALLOWED_ORIGINS || 'https://minnebo.ai,https://minnebo-ai.vercel.app,http://localhost:3000')
    .split(',').map(s => s.trim());
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0];
}

function getClientKey(req) {
  return req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown';
}

function checkRateLimit(key) {
  const now = Date.now();
  const entry = rateLimits.get(key) || { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_LIMIT_WINDOW) {
    entry.count = 0;
    entry.windowStart = now;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    throw new Error('Rate limit exceeded');
  }
  entry.count++;
  rateLimits.set(key, entry);
}

export default async function handler(req, res) {
  if (!validateHost(req)) {
    return res.status(400).json({ error: 'Invalid host header' });
  }

  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const clientKey = getClientKey(req);
    checkRateLimit(clientKey);

    if (req.method === 'POST') {
      const body = req.body || {};
      const id = typeof body.id === 'string' ? body.id.trim() : '';
      const vote = body.vote === 'up' || body.vote === 'down' ? body.vote : '';
      if (!id || !vote) {
        return res.status(400).json({ error: 'id and vote required' });
      }
      const entry = votesById.get(id) || { up: 0, down: 0 };
      entry[vote]++;
      votesById.set(id, entry);
      return res.status(200).json(entry);
    }

    if (req.method === 'GET') {
      const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
      if (!id) return res.status(400).json({ error: 'id required' });
      const entry = votesById.get(id) || { up: 0, down: 0 };
      return res.status(200).json(entry);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    if (e instanceof Error && e.message.includes('Rate limit')) {
      return res.status(429).json({ error: e.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}

