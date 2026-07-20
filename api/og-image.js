import { buildOgSvg } from './og-template.js';

// Validate Host header to prevent DNS rebinding
function getAllowedHosts() {
  const env = process.env.ALLOWED_HOSTS;
  if (env && env.trim().length > 0) {
    return env.split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
  }
  return ['minnebo.ai', 'www.minnebo.ai', 'minnebo-ai.vercel.app', 'localhost:3000'];
}
function validateHost(req) {
  const host = (req.headers.host || '').toLowerCase();
  return Boolean(host && getAllowedHosts().includes(host));
}
function getAllowedOrigin(req) {
  const origin = req.headers.origin;
  const allowed = (process.env.ALLOWED_ORIGINS || 'https://minnebo.ai,https://minnebo-ai.vercel.app,http://localhost:3000')
    .split(',').map(s => s.trim());
  if (origin && allowed.includes(origin)) return origin;
  return allowed[0];
}

async function loadConversationById(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) return { question: '', answer: '' };
  try {
    const r = await fetch(`https://minnebo-ai.vercel.app/api/secure-store?id=${id}`);
    if (!r.ok) return { question: '', answer: '' };
    const data = await r.json();
    return { question: data.question || '', answer: data.answer || '' };
  } catch {
    return { question: '', answer: '' };
  }
}

export default async function handler(req, res) {
  if (!validateHost(req)) {
    return res.status(400).end('Invalid host header');
  }

  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'HEAD') return res.status(200).end();

  let id = req.query.id;
  if (Array.isArray(id)) id = id[0];

  let question = '';
  let answer = '';
  if (id && typeof id === 'string') {
    ({ question, answer } = await loadConversationById(id));
  }

  res.send(buildOgSvg({ question, answer }));
}
