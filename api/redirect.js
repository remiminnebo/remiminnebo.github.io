export default async function handler(req, res) {
  const { share, s } = req.query;
  
  let question = '';
  let answer = '';
  
  if (share) {
    // Try to fetch from database
    try {
      const conversations = new Map(); // This should be persistent storage
      const conversation = conversations.get(share);
      if (conversation) {
        question = conversation.question;
        answer = conversation.answer;
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
    }
  } else if (s) {
    // Decode from URL parameter
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(s))));
      question = decoded.q || '';
      answer = decoded.a || '';
    } catch (error) {
      console.error('Failed to decode conversation:', error);
    }
  }
  
  const imageUrl = `https://minnebo-ai.vercel.app/api/og-image?question=${encodeURIComponent(question)}&answer=${encodeURIComponent(answer)}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${question ? `${question} - minnebo.ai` : 'MINNEBO'}</title>
      <link rel="icon" type="image/svg+xml" href="https://minnebo.ai/favicon.svg" />
      
      <!-- Open Graph meta tags -->
      <meta property="og:title" content="${question || 'minnebo.ai - AI Wisdom'}" />
      <meta property="og:description" content="${answer ? answer.substring(0, 200) + (answer.length > 200 ? '...' : '') : 'Discover profound insights and wisdom through AI conversations'}" />
      <meta property="og:url" content="https://minnebo.ai${req.url}" />
      <meta property="og:type" content="article" />
      <meta property="og:site_name" content="minnebo.ai" />
      <meta property="og:image" content="${imageUrl}" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      
      <!-- Twitter Card meta tags -->
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="${question || 'minnebo.ai - AI Wisdom'}" />
      <meta name="twitter:description" content="${answer ? answer.substring(0, 200) + (answer.length > 200 ? '...' : '') : 'Discover profound insights and wisdom through AI conversations'}" />
      <meta name="twitter:image" content="${imageUrl}" />
      
      <script>
        // Redirect to main site after meta tags are loaded
        window.location.href = 'https://minnebo.ai${req.url}';
      </script>
    </head>
    <body>
      <p>Redirecting...</p>
    </body>
    </html>
  `;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
}