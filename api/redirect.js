export default async function handler(req, res) {
  const { share } = req.query;
  
  let question = '';
  let answer = '';
  
  if (share) {
    // Fetch from secure store API
    try {
      const response = await fetch(`https://minnebo-ai.vercel.app/api/store?id=${share}`);
      if (response.ok) {
        const data = await response.json();
        question = data.question || '';
        answer = data.answer || '';
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
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
        // Load the React app with the shared conversation
        window.addEventListener('DOMContentLoaded', function() {
          const params = new URLSearchParams(window.location.search);
          const shareId = params.get('share');
          
          if (shareId) {
            // Redirect to the main site with parameters
            window.location.href = 'https://minnebo.ai/?share=' + shareId;
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