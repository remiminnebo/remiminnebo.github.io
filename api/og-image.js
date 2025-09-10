// More comprehensive text sanitization for SVG
function sanitizeForSvg(text) {
  if (!text || typeof text !== 'string') return '';
  
  // Remove any potential SVG/XML elements and attributes
  return text
    .replace(/[<>&"']/g, (match) => {
      const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
      return entities[match] || match;
    })
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/<\/?[^>]+(>|$)/g, '') // Remove any remaining HTML/XML tags
    .trim();
}

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

export default async function handler(req, res) {
  // Validate Host header first
  if (!validateHost(req)) {
    return res.status(400).end('Invalid host header');
  }
  
  res.setHeader('Access-Control-Allow-Origin', getAllowedOrigin(req));
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Shorter cache for security
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent parameter pollution - extract single values only
  let question = req.query.question || '';
  let answer = req.query.answer || '';
  let id = req.query.id || '';
  
  // Handle arrays by taking first value
  if (Array.isArray(question)) question = question[0] || '';
  if (Array.isArray(answer)) answer = answer[0] || '';
  if (Array.isArray(id)) id = id[0] || '';
  
  let validatedQuestion = '';
  let validatedAnswer = '';
  
  // If an ID is provided, validate through secure store
  if (id && typeof id === 'string') {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      try {
        const response = await fetch(`https://minnebo-ai.vercel.app/api/secure-store?id=${id}`);
        if (response.ok) {
          const data = await response.json();
          validatedQuestion = data.question || '';
          validatedAnswer = data.answer || '';
        }
      } catch (error) {
        console.error('Failed to validate content - error type:', error instanceof Error ? error.constructor.name : typeof error);
      }
    }
  } else {
    // No fallback - require ID validation for security
    validatedQuestion = '';
    validatedAnswer = '';
  }

  const questionText = validatedQuestion ? (validatedQuestion.length > 60 ? validatedQuestion.substring(0, 60) + '...' : validatedQuestion) : '';
  const answerText = validatedAnswer ? (validatedAnswer.length > 100 ? validatedAnswer.substring(0, 100) + '...' : validatedAnswer) : '';

  // Use static, safe logo instead of fetching external content
  const logoSvg = `
    <rect x="450" y="80" width="300" height="120" rx="20" fill="white" fill-opacity="0.9" />
    <text x="600" y="150" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="#310080">MINNEBO</text>
  `;

  const svg = `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Main background gradient -->
        <linearGradient id="mainBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#03BFF3;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#4609A8;stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:#310080;stop-opacity:1" />
        </linearGradient>
        
        <!-- Logo gradient -->
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#FF0095;stop-opacity:1" />
          <stop offset="25%" style="stop-color:#FF0004;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#44FF06;stop-opacity:1" />
          <stop offset="75%" style="stop-color:#8DF28F;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#FFFFFF;stop-opacity:1" />
        </linearGradient>
        
        <!-- Text shadow filter -->
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.5)"/>
        </filter>
        
        <!-- Glow effect -->
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Background with subtle pattern -->
      <rect width="1200" height="630" fill="url(#mainBg)" />
      
      <!-- Subtle overlay pattern -->
      <rect width="1200" height="630" fill="url(#pattern)" opacity="0.1" />
      
      <!-- Top decorative border -->
      <rect x="0" y="0" width="1200" height="8" fill="url(#logoGradient)" />
      <rect x="0" y="622" width="1200" height="8" fill="url(#logoGradient)" />
      
      <!-- Main logo area -->
      <rect x="50" y="50" width="300" height="120" rx="20" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" stroke-width="2" />
      
      <!-- MINNEBO logo text -->
      <text x="200" y="130" font-family="Arial, sans-serif" font-size="42" font-weight="bold" text-anchor="middle" fill="url(#logoGradient)" filter="url(#glow)">
        MINNEBO
      </text>
      
      <!-- Subtitle -->
      <text x="200" y="155" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="rgba(255,255,255,0.8)">
        AI Wisdom
      </text>
      
      ${questionText ? `
      <!-- Question section with background -->
      <rect x="380" y="80" width="770" height="120" rx="15" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <text x="765" y="110" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="rgba(255,255,255,0.6)">
        QUESTION
      </text>
      <text x="765" y="140" font-family="Georgia, serif" font-size="24" font-weight="normal" text-anchor="middle" fill="white" filter="url(#textShadow)">
        ${sanitizeForSvg(questionText)}
      </text>
      <text x="765" y="170" font-family="Georgia, serif" font-size="24" font-weight="normal" text-anchor="middle" fill="white" filter="url(#textShadow)">
        ${questionText.length > 50 ? '...' : ''}
      </text>
      ` : ''}
      
      ${answerText ? `
      <!-- Answer section with elegant styling -->
      <rect x="380" y="220" width="770" height="300" rx="15" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <text x="765" y="250" font-family="Arial, sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="rgba(255,255,255,0.6)">
        WISDOM
      </text>
      
      <!-- Answer text with proper line breaks -->
      ${(() => {
        const cleanAnswer = sanitizeForSvg(answerText);
        const words = cleanAnswer.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (let word of words) {
          if ((currentLine + ' ' + word).length > 60) {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = currentLine ? currentLine + ' ' + word : word;
          }
          if (lines.length >= 6) break; // Max 6 lines
        }
        if (currentLine && lines.length < 6) lines.push(currentLine);
        
        return lines.map((line, i) => 
          `<text x="765" y="${290 + i * 25}" font-family="Georgia, serif" font-size="18" text-anchor="middle" fill="rgba(255,255,255,0.95)" filter="url(#textShadow)">${line}</text>`
        ).join('') + (words.length > lines.join(' ').split(' ').length ? 
          `<text x="765" y="${290 + lines.length * 25}" font-family="Georgia, serif" font-size="16" text-anchor="middle" fill="rgba(255,255,255,0.7)">...</text>` : '');
      })()}
      ` : `
      <!-- Default wisdom message when no content -->
      <rect x="380" y="220" width="770" height="200" rx="15" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
      <text x="765" y="280" font-family="Georgia, serif" font-size="28" text-anchor="middle" fill="rgba(255,255,255,0.9)" filter="url(#textShadow)">
        "The empty vessel receives the water."
      </text>
      <text x="765" y="320" font-family="Arial, sans-serif" font-size="18" text-anchor="middle" fill="rgba(255,255,255,0.7)">
        Share your questions and discover ancient wisdom
      </text>
      <text x="765" y="350" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="rgba(255,255,255,0.6)">
        powered by AI consciousness
      </text>
      `}
      
      <!-- Decorative elements -->
      <circle cx="100" cy="500" r="3" fill="rgba(255,255,255,0.4)" />
      <circle cx="120" cy="520" r="2" fill="rgba(255,255,255,0.3)" />
      <circle cx="140" cy="500" r="2.5" fill="rgba(255,255,255,0.4)" />
      
      <circle cx="1050" cy="150" r="3" fill="rgba(255,255,255,0.4)" />
      <circle cx="1070" cy="170" r="2" fill="rgba(255,255,255,0.3)" />
      <circle cx="1090" cy="150" r="2.5" fill="rgba(255,255,255,0.4)" />
      
      <!-- Website URL with elegant styling -->
      <rect x="950" y="550" width="200" height="40" rx="20" fill="rgba(255,255,255,0.1)" />
      <text x="1050" y="575" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="white" filter="url(#textShadow)">
        minnebo.ai
      </text>
      
      <!-- Powered by tag -->
      <text x="600" y="610" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="rgba(255,255,255,0.5)">
        Discover profound insights through AI-powered ancient wisdom
      </text>
    </svg>
  `;

  res.send(svg);
}
