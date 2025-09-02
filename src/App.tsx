import logo from './logo.svg';
import { useState, useEffect } from 'react';

function App(): JSX.Element {
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [responseIndex, setResponseIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSend = () => {
    if (input.trim()) {
      const responses = ['Clarity arrives when the mind is unguarded.', 'The path opens to Yes.'];
      setAnswer(responses[responseIndex]);
      setResponseIndex((responseIndex + 1) % 2);
      setInput('');
    }
  };

  const chatInput = (
    <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '500px', flexWrap: 'wrap' }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Cast your question into the flow..."
        className="thick-cursor"
        style={{
          padding: '12px 16px',
          fontSize: '16px',
          border: 'none',
          borderRadius: '8px',
          width: '100%',
          minWidth: '250px',
          flex: '1',
          outline: 'none',
          fontFamily: 'Tahoma, sans-serif',
          backgroundColor: 'rgba(255,255,255,0.9)',
          fontWeight: 'bold',
          caretColor: '#FF69B4',
          color: '#200F3B'
        }}
      />
      <button
        onClick={handleSend}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          padding: '12px 16px',
          minWidth: '50px',
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
  );

  return (
    <div style={{
      backgroundColor: '#03BFF3',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Tahoma, sans-serif',
      position: 'relative'
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        paddingBottom: isMobile ? '120px' : '20px'
      }}>
        <img src={logo} alt="Logo" style={{ width: '90vw', maxWidth: '700px', marginBottom: '40px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        
        {!isMobile && (
          <div style={{ marginBottom: '20px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            {chatInput}
          </div>
        )}
        
        {answer && (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '18px',
            maxWidth: isMobile ? '90vw' : '400px',
            width: isMobile ? '100%' : 'auto',
            textAlign: 'center',
            fontFamily: 'Tahoma, sans-serif',
            fontWeight: 'bold',
            color: '#200F3B'
          }}>
            {answer}
          </div>
        )}
      </div>
      
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px',
          backgroundColor: '#03BFF3',
          display: 'flex',
          justifyContent: 'center'
        }}>
          {chatInput}
        </div>
      )}
    </div>
  );
}

export default App;