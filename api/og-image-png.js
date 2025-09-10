import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

function sanitizeForSvg(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/[<>&"']/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[m] || m))
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();
}

function getAllowedHosts() {
  const env = process.env.ALLOWED_HOSTS;
  if (env && env.trim().length > 0) {
    return env.split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
  }
  return ['minnebo.ai', 'www.minnebo.ai', 'minnebo-ai.vercel.app', 'localhost:3000'];
}
function validateHost(req) {
  const host = (req.headers.host || '').toLowerCase();
  const allowed = getAllowedHosts();
  return Boolean(host && allowed.includes(host));
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
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // params
  let id = req.query.id;
  if (Array.isArray(id)) id = id[0];

  let { question, answer } = { question: '', answer: '' };
  if (id && typeof id === 'string') {
    ({ question, answer } = await loadConversationById(id));
  }
  const questionText = question ? (question.length > 60 ? question.substring(0, 60) + '…' : question) : '';
  const answerText = answer ? (answer.length > 100 ? answer.substring(0, 100) + '…' : answer) : '';

  // embed local logo SVG
  let embeddedLogo = '';
  try {
    const logoPath = path.join(process.cwd(), 'src', 'logo.svg');
    let raw = fs.readFileSync(logoPath, 'utf8');
    raw = raw.replace(/<\?xml[\s\S]*?\?>/i, '').replace(/<!DOCTYPE[\s\S]*?>/i, '');
    embeddedLogo = raw;
  } catch {
    embeddedLogo = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="60"><text x="0" y="40" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#310080">MINNEBO</text></svg>';
  }

  // Build SVG then rasterize to PNG with sharp
  const svg = `
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#03BFF3" />
        <stop offset="100%" stop-color="#310080" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.4)"/>
      </filter>
    </defs>
    <rect width="1200" height="630" fill="#03BFF3" />
    <rect width="1200" height="630" fill="url(#bg)" />
    <g transform="translate(150,90) scale(1.0)" filter="url(#shadow)">
      ${embeddedLogo}
    </g>
    ${questionText ? `<text x="150" y="280" font-family="Arial, sans-serif" font-size="28" font-weight="bold" fill="#FFFFFF">${sanitizeForSvg(questionText)}</text>` : ''}
    ${answerText ? `<text x="150" y="320" font-family="Georgia, serif" font-size="22" fill="rgba(255,255,255,0.95)">${sanitizeForSvg(answerText)}</text>` : ''}
  </svg>`;

  try {
    const buf = await sharp(Buffer.from(svg)).png().toBuffer();
    res.end(buf);
  } catch (e) {
    console.error('PNG render error:', e instanceof Error ? e.message : e);
    res.status(500).end('OG PNG error');
  }
}

