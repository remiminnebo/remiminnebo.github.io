export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/html');

  const { question = '', answer = '' } = req.query;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          margin: 0;
          padding: 40px;
          width: 1200px;
          height: 630px;
          background: linear-gradient(135deg, #03BFF3 0%, #310080 100%);
          font-family: 'Arial', sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          box-sizing: border-box;
        }
        .logo {
          width: 200px;
          height: 200px;
          margin-bottom: 30px;
          background: white;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          font-weight: bold;
          color: #310080;
        }
        .question {
          font-size: 32px;
          font-weight: bold;
          color: white;
          text-align: center;
          margin-bottom: 20px;
          max-width: 1000px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .answer {
          font-size: 24px;
          color: rgba(255,255,255,0.9);
          text-align: center;
          max-width: 1000px;
          line-height: 1.4;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        .site {
          position: absolute;
          bottom: 30px;
          right: 40px;
          font-size: 20px;
          color: rgba(255,255,255,0.8);
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="logo">MINNEBO</div>
      ${question ? `<div class="question">${question}</div>` : ''}
      ${answer ? `<div class="answer">${answer.substring(0, 150)}${answer.length > 150 ? '...' : ''}</div>` : ''}
      <div class="site">minnebo.ai</div>
    </body>
    </html>
  `;

  res.send(html);
}