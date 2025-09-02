import logo from './logo.svg';
import { useState } from 'react';

function App(): JSX.Element {
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [responseIndex, setResponseIndex] = useState(0);

  const handleSend = () => {
    if (input.trim()) {
      const responses = ['Just keep an open mind...', 'The answer is Yes.'];
      setAnswer(responses[responseIndex]);
      setResponseIndex((responseIndex + 1) % 2);
      setInput('');
    }
  };

  return (
    <div style={{
      backgroundColor: answer === 'The answer is Yes.' ? '#1C71E9' : '#03BFF3',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      fontFamily: 'Tahoma, sans-serif'
    }}>
      <img src={logo} alt="Logo" style={{ width: '700px', marginBottom: '40px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Hit me with some wonderin'! Ask away."
          style={{
            padding: '12px 16px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '8px',
            width: '400px',
            outline: 'none',
            fontFamily: 'Tahoma, sans-serif',
            backgroundColor: 'rgba(255,255,255,0.9)',
            fontWeight: 'bold'
          }}
        />
        <button
          onClick={handleSend}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            padding: '12px 20px',
            fontSize: '20px',
            backgroundColor: isHovered ? '#00C7EB' : '#200F3B',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'Tahoma, sans-serif',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s ease'
          }}
        >
          ➤
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
          fontFamily: 'Tahoma, sans-serif',
          fontWeight: 'bold'
        }}>
          {answer}
        </div>
      )}
    </div>
  );
}

export default App;