import logo from './logo.svg';
import { useState, useEffect } from 'react';

function App(): JSX.Element {
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');

  const parseMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br />');
  };
  const [isHovered, setIsHovered] = useState(false);
  const [responseIndex, setResponseIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showSnake, setShowSnake] = useState(false);
  const [snake, setSnake] = useState([{x: 10, y: 10}]);
  const [food, setFood] = useState({x: 15, y: 15});
  const [direction, setDirection] = useState({x: 0, y: 1});
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(parseInt(localStorage.getItem('snakeHighScore') || '0'));

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!showSnake) return;
    const handleKeyPress = (e) => {
      switch(e.key) {
        case 'ArrowUp': setDirection({x: 0, y: -1}); break;
        case 'ArrowDown': setDirection({x: 0, y: 1}); break;
        case 'ArrowLeft': setDirection({x: -1, y: 0}); break;
        case 'ArrowRight': setDirection({x: 1, y: 0}); break;
        case 'Escape': setShowSnake(false); break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showSnake]);

  useEffect(() => {
    if (!showSnake) return;
    const gameLoop = setInterval(() => {
      setSnake(currentSnake => {
        const newSnake = [...currentSnake];
        const head = {x: newSnake[0].x + direction.x, y: newSnake[0].y + direction.y};
        
        if (head.x < 0 || head.x >= 30 || head.y < 0 || head.y >= 20 || 
            newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
          setShowSnake(false);
          setSnake([{x: 10, y: 10}]);
          setDirection({x: 0, y: 1});
          setScore(0);
          return currentSnake;
        }
        
        newSnake.unshift(head);
        
        if (head.x === food.x && head.y === food.y) {
          setScore(s => {
            const newScore = s + 1;
            if (newScore > highScore) {
              setHighScore(newScore);
              localStorage.setItem('snakeHighScore', newScore.toString());
            }
            return newScore;
          });
          setFood({x: Math.floor(Math.random() * 30), y: Math.floor(Math.random() * 20)});
        } else {
          newSnake.pop();
        }
        
        return newSnake;
      });
    }, 150);
    
    return () => clearInterval(gameLoop);
  }, [showSnake, direction, food, highScore]);

  const handleSend = async () => {
    console.log('handleSend called, input:', input);
    if (input.trim()) {
      console.log('Input is valid, proceeding...');
      if (input.toLowerCase() === 'snake') {
        setShowSnake(true);
        setInput('');
        return;
      }
      
      const userMessage = input;
      setLastQuestion(userMessage);
      setInput('');
      setAnswer('Tracing the currents beneath the question…');
      console.log('Question:', userMessage);
      
      try {
        console.log('Sending request to API...');
        const response = await fetch('https://minnebo-ai.vercel.app/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage
          })
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers.get('content-type'));
        
        if (!response.ok) {
          setAnswer(`Connection error: ${response.status}. Please try again.`);
          return;
        }
        
        const contentType = response.headers.get('content-type');
        console.log('Content type:', contentType);
        
        if (contentType?.includes('text/plain')) {
          console.log('Handling streaming response');
          console.log('Response body available:', !!response.body);
          // Handle streaming response
          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let result = '';
          
          if (reader) {
            console.log('Reader available, starting stream...');
            setAnswer('');
            let chunkCount = 0;
            while (true) {
              const { done, value } = await reader.read();
              chunkCount++;
              console.log(`Chunk ${chunkCount}: done=${done}, value length=${value?.length || 0}`);
              if (done) {
                console.log('Stream finished, total result length:', result.length);
                break;
              }
              
              const chunk = decoder.decode(value, { stream: true });
              result += chunk;
              console.log('Chunk received:', JSON.stringify(chunk));
              console.log('Total result so far:', result.length, 'chars');
              setAnswer(result);
            }
            if (result.length === 0) {
              setAnswer('No response received from API');
            }
          } else {
            console.log('No reader available');
            setAnswer('Stream reader not available');
          }
        } else {
          console.log('Handling JSON response');
          // Handle JSON response (fallback)
          const data = await response.json();
          console.log('JSON data:', data);
          if (data.error) {
            setAnswer(`Error: ${data.error}`);
          } else {
            setAnswer(data.response);
          }
        }
      } catch (error) {
        console.error('Fetch error:', error);
        setAnswer('Connection error. Please try again.');
      }
    }
  };

  const chatInput = (
    <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '500px', flexWrap: 'wrap' }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        placeholder={lastQuestion || "Cast your question into the flow..."}
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

  if (showSnake) {
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
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: 'white',
          fontSize: '24px',
          fontWeight: 'bold'
        }}>
          HIGH SCORE: {highScore}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(30, 20px)',
            gridTemplateRows: 'repeat(20, 20px)',
            gap: '1px',
            backgroundColor: '#333'
          }}>
            {Array.from({length: 600}, (_, i) => {
              const x = i % 30;
              const y = Math.floor(i / 30);
              const isSnake = snake.some(segment => segment.x === x && segment.y === y);
              const isFood = food.x === x && food.y === y;
              return (
                <div
                  key={i}
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: isSnake ? '#310080' : isFood ? '#FF0004' : '#03BFF3'
                  }}
                />
              );
            })}
          </div>
        </div>
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'white',
          fontSize: '16px'
        }}>
          Use arrow keys to play • ESC to exit
        </div>
      </div>
    );
  }

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
          <div 
            style={{
              backgroundColor: 'rgba(255,255,255,0.8)',
              padding: '20px',
              borderRadius: '12px',
              fontSize: '18px',
              lineHeight: '1.6',
              maxWidth: isMobile ? '90vw' : '500px',
              width: isMobile ? '100%' : 'auto',
              textAlign: 'left',
              fontFamily: 'Tahoma, sans-serif',
              fontWeight: 'normal',
              color: '#200F3B',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
            dangerouslySetInnerHTML={{ __html: parseMarkdown(answer) }}
          />
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