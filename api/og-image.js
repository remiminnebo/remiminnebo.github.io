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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://minnebo.ai');
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Shorter cache for security
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const { question = '', answer = '', id = '' } = req.query;
  
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
        console.error('Failed to validate content:', error);
      }
    }
  } else {
    // Fallback: heavily sanitize direct parameters (but prefer using ID)
    validatedQuestion = sanitizeForSvg(question);
    validatedAnswer = sanitizeForSvg(answer);
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
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#03BFF3;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#310080;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bg)" />
      
      <!-- Logo -->
      ${logoSvg}
      
      ${questionText ? `
      <!-- Question -->
      <text x="600" y="280" font-family="Arial, sans-serif" font-size="28" font-weight="bold" text-anchor="middle" fill="white">
        ${questionText}
      </text>
      ` : ''}
      
      ${answerText ? `
      <!-- Answer -->
      <text x="600" y="350" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="rgba(255,255,255,0.9)">
        ${answerText}
      </text>
      ` : ''}
      
      <!-- Site name -->
      <text x="1150" y="580" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="end" fill="rgba(255,255,255,0.8)">minnebo.ai</text>
    </svg>
  `;

  res.send(svg);
}