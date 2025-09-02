import logo from './logo.svg';
import { useState } from 'react';

function App(): JSX.Element {
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');

  const handleSend = () => {
    if (input.trim()) {
      setAnswer('Just keep an open mind...');
      setInput('');
    }
  };

  return (
    <div style={{
      backgroundColor: '#03BFF3',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      fontFamily: 'Tahoma, sans-serif'
    }}>
      <img src={logo} alt="Logo" style={{ width: '300px', marginBottom: '40px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask me a question.."
          style={{
            padding: '12px 16px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '8px',
            width: '400px',
            outline: 'none',
            fontFamily: 'Tahoma, sans-serif',
            backgroundColor: 'rgba(255,255,255,0.9)'
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: '12px 20px',
            fontSize: '16px',
            backgroundColor: 'rgba(255,255,255,0.9)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'Tahoma, sans-serif',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          ➤ Send
        </button>
      </div>
      
      {answer && (
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.8)',
          padding: '16px',
          borderRadius: '8px',
          fontSize: '18px',
          maxWidth: '500px',
          textAlign: 'center',
          fontFamily: 'Tahoma, sans-serif'
        }}>
          {answer}
        </div>
      )}
    </div>
  );
}

export default App;