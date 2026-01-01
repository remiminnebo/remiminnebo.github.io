
const fetch = require('node-fetch'); // Ensure you have node-fetch or run in Node 18+

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is not set.');
  process.exit(1);
}

async function testModel(modelName) {
  console.log(`\nTesting model: ${modelName}...`);
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: "Hello, are you working?"
          }]
        }]
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success! Response:`);
      console.log(data.candidates?.[0]?.content?.parts?.[0]?.text);
      return true;
    } else {
      console.error(`❌ Failed with status: ${response.status}`);
      const errorText = await response.text();
      console.error('Error body:', errorText);
      return false;
    }
  } catch (error) {
    console.error(`❌ Exception:`, error);
    return false;
  }
}

async function run() {
  console.log('--- Gemini API Debugger ---');
  
  const v2Success = await testModel('gemini-2.0-flash');
  
  if (!v2Success) {
    console.log('\nAttempting fallback check...');
    await testModel('gemini-1.5-flash');
  }
}

run();
