// HTML escape function to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
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

export default async function handler(req, res) {
  // Validate Host header first
  if (!validateHost(req)) {
    return res.status(400).end('Invalid host header');
  }
  
  // Prevent parameter pollution
  let share = req.query.share;
  
  if (Array.isArray(share)) {
    share = share[0]; // Take first value if array
  }
  
  let question = '';
  let answer = '';
  
  // Validate share ID format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (share && typeof share === 'string') {
    if (uuidRegex.test(share)) {
      // Fetch from secure store API
      try {
        const response = await fetch(`https://minnebo-ai.vercel.app/api/secure-store?id=${share}`);
        if (response.ok) {
          const data = await response.json();
          question = data.question || '';
          answer = data.answer || '';
        }
      } catch (error) {
        console.error('Failed to fetch conversation - error type:', error instanceof Error ? error.constructor.name : typeof error);
      }
    }
  }
  
  // Always use share ID for OG image to ensure validation and security
  const imagePng = share && uuidRegex.test(share)
    ? `https://minnebo-ai.vercel.app/api/og-image-png?id=${share}`
    : `https://minnebo-ai.vercel.app/api/og-image-png`;
  const imageSvg = share && uuidRegex.test(share)
    ? `https://minnebo-ai.vercel.app/api/og-image?id=${share}`
    : `https://minnebo-ai.vercel.app/api/og-image`;
  
  // Set security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self' https:; script-src 'unsafe-inline' https:; style-src 'unsafe-inline' https:; img-src 'self' https: data:;");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${escapeHtml(question ? `${question} - minnebo.ai` : 'MINNEBO')}</title>
      <link rel="icon" type="image/svg+xml" href="https://minnebo.ai/favicon.svg" />
      
      <!-- Open Graph meta tags -->
      <meta property="og:title" content="${escapeHtml(question ? `"${question}"` : 'MINNEBO - AI Wisdom & Ancient Insights')}" />
      <meta property="og:description" content="${escapeHtml(answer ? 
        `${answer.substring(0, 160)}${answer.length > 160 ? '...' : ''} | Discover profound wisdom through AI-powered ancient teachings.` : 
        '🧙‍♂️ Transform your questions into profound wisdom. Experience AI-powered insights inspired by ancient sages, mystics, and philosophers. Ask anything and receive guidance that flows like water through the ages.')}" />
      <meta property="og:url" content="https://minnebo.ai${share && uuidRegex.test(share) ? `/?share=${escapeHtml(share)}` : ''}" />
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="MINNEBO" />
      <meta property="og:image" content="${escapeHtml(imagePng)}" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image" content="${escapeHtml(imageSvg)}" />
      <meta property="og:image:type" content="image/svg+xml" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="MINNEBO AI Wisdom - ${escapeHtml(question ? question.substring(0, 50) : 'Ancient wisdom meets modern AI')}" />
      
      <!-- Twitter Card meta tags -->
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@minnebo_ai" />
      <meta name="twitter:title" content="${escapeHtml(question ? `"${question}"` : 'MINNEBO - AI Wisdom & Ancient Insights')}" />
      <meta name="twitter:description" content="${escapeHtml(answer ? 
        `${answer.substring(0, 140)}${answer.length > 140 ? '...' : ''}` : 
        '🧙‍♂️ Experience profound AI wisdom inspired by ancient teachings. Ask your deepest questions and receive guidance that transcends time.')}" />
      <meta name="twitter:image" content="${escapeHtml(imagePng)}" />
      <meta name="twitter:image:type" content="image/png" />
      <meta name="twitter:image:alt" content="MINNEBO AI Wisdom - ${escapeHtml(question ? question.substring(0, 50) : 'Ancient wisdom meets modern AI')}" />
      
      <script>
        // Load the React app with the shared conversation
        window.addEventListener('DOMContentLoaded', function() {
          const params = new URLSearchParams(window.location.search);
          const shareId = params.get('share');
          
          if (shareId) {
            // Validate UUID format before redirecting
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(shareId)) {
              // Safely encode the shareId parameter
              window.location.href = 'https://minnebo.ai/?share=' + encodeURIComponent(shareId);
            } else {
              // Invalid share ID, redirect to home
              window.location.href = 'https://minnebo.ai/';
            }
          } else {
            window.location.href = 'https://minnebo.ai/';
          }
        });
      </script>
    </head>
    <body>
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: Arial, sans-serif; background: linear-gradient(135deg, #03BFF3 0%, #310080 100%); color: white;">
        <div style="text-align: center;">
          <h1>Loading wisdom...</h1>
          <p>Redirecting to minnebo.ai</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}
