import { createCanvas, loadImage } from 'canvas';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

  const { question = '', answer = '' } = req.query;

  try {
    // Create canvas
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
    gradient.addColorStop(0, '#03BFF3');
    gradient.addColorStop(1, '#310080');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 630);

    // Load and draw logo
    try {
      const logo = await loadImage('https://minnebo.ai/logo.svg');
      ctx.drawImage(logo, 450, 50, 300, 150);
    } catch (error) {
      // Fallback if logo fails to load
      ctx.fillStyle = 'white';
      ctx.roundRect(500, 100, 200, 100, 20);
      ctx.fill();
      ctx.fillStyle = '#310080';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('MINNEBO', 600, 160);
    }

  // Question
  if (question) {
    ctx.fillStyle = 'white';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    const questionText = question.length > 80 ? question.substring(0, 80) + '...' : question;
    ctx.fillText(questionText, 600, 250);
  }

  // Answer
  if (answer) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    const answerText = answer.length > 120 ? answer.substring(0, 120) + '...' : answer;
    
    // Word wrap for answer
    const words = answerText.split(' ');
    let line = '';
    let y = 300;
    
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > 1000 && n > 0) {
        ctx.fillText(line, 600, y);
        line = words[n] + ' ';
        y += 30;
        if (y > 400) break; // Limit to 3 lines
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 600, y);
  }

  // Site name
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'right';
  ctx.fillText('minnebo.ai', 1150, 580);

    // Send image
    const buffer = canvas.toBuffer('image/png');
    res.send(buffer);
  } catch (error) {
    console.error('OG Image generation failed:', error);
    res.status(500).send('Image generation failed');
  }
}