export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  const { question = '', answer = '' } = req.query;

  const questionText = question ? (question.length > 60 ? question.substring(0, 60) + '...' : question) : '';
  const answerText = answer ? (answer.length > 100 ? answer.substring(0, 100) + '...' : answer) : '';

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
      
      <!-- Logo area -->
      <rect x="450" y="80" width="300" height="120" rx="20" fill="white" fill-opacity="0.9" />
      <text x="600" y="150" font-family="Arial, sans-serif" font-size="36" font-weight="bold" text-anchor="middle" fill="#310080">MINNEBO</text>
      
      ${questionText ? `
      <!-- Question -->
      <text x="600" y="280" font-family="Arial, sans-serif" font-size="28" font-weight="bold" text-anchor="middle" fill="white">
        ${questionText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </text>
      ` : ''}
      
      ${answerText ? `
      <!-- Answer -->
      <text x="600" y="350" font-family="Arial, sans-serif" font-size="20" text-anchor="middle" fill="rgba(255,255,255,0.9)">
        ${answerText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </text>
      ` : ''}
      
      <!-- Site name -->
      <text x="1150" y="580" font-family="Arial, sans-serif" font-size="18" font-weight="bold" text-anchor="end" fill="rgba(255,255,255,0.8)">minnebo.ai</text>
    </svg>
  `;

  res.send(svg);
}