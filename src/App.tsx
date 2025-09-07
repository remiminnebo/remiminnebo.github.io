import logo from './logo.svg';
import { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { WhatsappShareButton, LinkedinShareButton, FacebookShareButton } from 'react-share';

function App(): JSX.Element {
  // Add Google Fonts and CSS animations
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Katibeh&display=swap';
  fontLink.rel = 'stylesheet';
  if (!document.head.querySelector('link[href*="Katibeh"]')) {
    document.head.appendChild(fontLink);
  }
  
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pulse {
      0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
      40% { transform: scale(1); opacity: 1; }
    }
    @keyframes trippy {
      0% { transform: scale(1) rotate(0deg); }
      25% { transform: scale(1.02) rotate(0.5deg); }
      50% { transform: scale(1.04) rotate(0deg); }
      75% { transform: scale(1.02) rotate(-0.5deg); }
      100% { transform: scale(1) rotate(0deg); }
    }
    @keyframes trippy2 {
      0% { transform: scale(0.98) rotate(0deg) skewX(0deg); }
      50% { transform: scale(1.06) rotate(-1deg) skewX(1deg); }
      100% { transform: scale(0.98) rotate(0deg) skewX(0deg); }
    }
    @keyframes trippy3 {
      0% { transform: translateX(0px) translateY(0px); }
      33% { transform: translateX(1px) translateY(-0.5px); }
      66% { transform: translateX(-0.5px) translateY(1px); }
      100% { transform: translateX(0px) translateY(0px); }
    }
    @keyframes fadeInOut {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
    }
  `;
  if (!document.head.querySelector('style[data-animations]')) {
    style.setAttribute('data-animations', 'true');
    document.head.appendChild(style);
  }
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [messages, setMessages] = useState<{question: string, answer: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isAnswerComplete, setIsAnswerComplete] = useState(false);
  const [showFlashMessage, setShowFlashMessage] = useState(false);
  const [flashMessageText, setFlashMessageText] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [cachedScreenshot, setCachedScreenshot] = useState<string | null>(null);
  const [validResponses, setValidResponses] = useState<Set<string>>(new Set());

  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setFlashMessageText('The link flows\ninto your vessel.');
      setShowFlashMessage(true);
      setTimeout(() => setShowFlashMessage(false), 2000);
    } catch (err) {
      // If all else fails, show the URL
      prompt('Copy this link:', text);
    }
    
    document.body.removeChild(textArea);
  };

  const createShareableUrl = async (question: string, answer: string) => {
    try {
      const response = await fetch('https://minnebo-ai.vercel.app/api/store', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer })
      });
      const data = await response.json();
      if (data.id) {
        return `https://minnebo.ai/?share=${data.id}`;
      }
    } catch (error) {
      console.error('Failed to create share link:', error);
    }
    return null;
  };

  const captureScreenshot = async () => {
    try {
      // Hide share menu for screenshot
      const wasMenuOpen = showShareMenu;
      setShowShareMenu(false);
      
      // Wait for state update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(document.body, {
        width: 1080,
        height: 1080,
        scale: 1,
        backgroundColor: '#03BFF3',
        useCORS: true,
        allowTaint: true,
        x: (window.innerWidth - 1080) / 2,
        y: 0
      });
      
      // Restore menu state
      setShowShareMenu(wasMenuOpen);
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Screenshot failed:', error);
      return null;
    }
  };

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

  const updateMetaTags = (question: string, answer: string) => {
    document.title = `${question} - minnebo.ai`;
    
    const updateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    
    const imageUrl = `https://minnebo-ai.vercel.app/api/og-image?question=${encodeURIComponent(question)}&answer=${encodeURIComponent(answer)}`;
    
    updateMeta('og:title', question);
    updateMeta('og:description', answer.substring(0, 200) + (answer.length > 200 ? '...' : ''));
    updateMeta('og:url', window.location.href);
    updateMeta('og:type', 'article');
    updateMeta('og:site_name', 'minnebo.ai');
    updateMeta('og:image', imageUrl);
    updateMeta('og:image:width', '1200');
    updateMeta('og:image:height', '630');
  };

  useEffect(() => {
    // Check for shared message in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const shareId = urlParams.get('share');
    const encoded = urlParams.get('s');
    
    if (shareId) {
      // Try to fetch from persistent storage
      fetch(`https://minnebo-ai.vercel.app/api/store?id=${shareId}`)
        .then(response => response.json())
        .then(data => {
          if (data.question && data.answer) {
            setLastQuestion(data.question);
            setAnswer(data.answer);
            setIsAnswerComplete(true);
            updateMetaTags(data.question, data.answer);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        })
        .catch(error => console.error('Failed to load shared conversation:', error));
    }

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
    if (input.trim()) {
      if (input.toLowerCase() === 'snake') {
        setShowSnake(true);
        setInput('');
        return;
      }
      
      const userMessage = input;
      setLastQuestion(userMessage);
      setInput('');
      setAnswer('');
      setIsTyping(true);
      setIsAnswerComplete(false);
      
      try {
        const response = await fetch('https://minnebo-ai.vercel.app/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: userMessage
          })
        });
        
        if (!response.ok) {
          setAnswer('Connection error. Please try again.');
          setIsTyping(false);
          return;
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let result = '';
        
        if (reader) {
          setIsTyping(false);
          setIsAnswerComplete(false);
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              setIsAnswerComplete(true);
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            result += chunk;
            setAnswer(result);
            // Mark this response as valid for sharing
            setValidResponses(prev => new Set(prev).add(result));
          }
        }
      } catch (error) {
        console.error('Fetch error:', error);
        setAnswer('Connection error. Please try again.');
        setIsTyping(false);
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
      {/* Flash Message */}
      {showFlashMessage && (
        <>
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: '#03BFF3',
            zIndex: 999
          }} />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '64px',
            fontWeight: 'bold',
            fontFamily: 'Katibeh, serif',
            textAlign: 'center',
            lineHeight: '1.2',
            whiteSpace: 'pre-line',
            zIndex: 1000
          }}>
            <div style={{
              animation: 'fadeInOut 2s ease-in-out, trippy 8s ease-in-out infinite'
            }}>
              {flashMessageText.split('').map((char, i) => {
                const colors = ['#310080', '#40FF00', '#44FF06', '#FF0004', '#FF0095', '#4609A8', '#8DF28F', '#FFFFFF'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                return <span key={i} style={{ color: randomColor }}>{char}</span>;
              })}
            </div>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              animation: 'fadeInOut 2s ease-in-out, trippy2 6s ease-in-out infinite reverse',
              opacity: 0.3,
              mixBlendMode: 'multiply'
            }}>
              {flashMessageText.split('').map((char, i) => {
                const colors = ['#310080', '#40FF00', '#44FF06', '#FF0004', '#FF0095', '#4609A8', '#8DF28F', '#FFFFFF'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                return <span key={i + 200} style={{ color: randomColor }}>{char}</span>;
              })}
            </div>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              animation: 'fadeInOut 2s ease-in-out, trippy3 10s linear infinite',
              opacity: 0.2,
              mixBlendMode: 'screen'
            }}>
              {flashMessageText.split('').map((char, i) => {
                const colors = ['#310080', '#40FF00', '#44FF06', '#FF0004', '#FF0095', '#4609A8', '#8DF28F', '#FFFFFF'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                return <span key={i + 400} style={{ color: randomColor }}>{char}</span>;
              })}
            </div>
          </div>
        </>
      )}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
        paddingBottom: isMobile ? '120px' : '20px'
      }}>
        <div style={{
          position: 'relative',
          width: '90vw',
          maxWidth: '700px',
          marginBottom: '40px'
        }}>
          <img 
            src={logo} 
            alt="Logo" 
            style={{ 
              width: '100%',
              animation: 'trippy 8s ease-in-out infinite'
            }} 
            onError={(e) => { e.currentTarget.style.display = 'none'; }} 
          />
          <img 
            src={logo} 
            alt="" 
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              animation: 'trippy2 6s ease-in-out infinite reverse',
              opacity: 0.3,
              mixBlendMode: 'multiply'
            }} 
            onError={(e) => { e.currentTarget.style.display = 'none'; }} 
          />
          <img 
            src={logo} 
            alt="" 
            style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              animation: 'trippy3 10s linear infinite',
              opacity: 0.2,
              mixBlendMode: 'screen'
            }} 
            onError={(e) => { e.currentTarget.style.display = 'none'; }} 
          />
        </div>
        
        {!isMobile && (
          <div style={{ marginBottom: '20px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            {chatInput}
          </div>
        )}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.8)',
            padding: '20px',
            borderRadius: '12px',
            fontSize: '18px',
            maxWidth: isMobile ? '90vw' : '500px',
            width: isMobile ? '100%' : 'auto',
            color: '#200F3B',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            The silence gathers before the word is born
            <div style={{
              display: 'flex',
              gap: '3px'
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#200F3B',
                animation: 'pulse 1.4s ease-in-out infinite both',
                animationDelay: '0s'
              }} />
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#200F3B',
                animation: 'pulse 1.4s ease-in-out infinite both',
                animationDelay: '0.2s'
              }} />
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#200F3B',
                animation: 'pulse 1.4s ease-in-out infinite both',
                animationDelay: '0.4s'
              }} />
            </div>
          </div>
        )}
        
        {answer && (
          <div style={{ position: 'relative' }}>
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
            <div style={{
              position: 'absolute',
              bottom: '-36px',
              left: '0px',
              display: isAnswerComplete ? 'flex' : 'none',
              gap: '16px'
            }}>
              <svg
                onClick={() => {
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(answer).then(() => {
                      setFlashMessageText('The wisdom flows\ninto your vessel.');
                      setShowFlashMessage(true);
                      setTimeout(() => setShowFlashMessage(false), 2000);
                    }).catch(() => {
                      fallbackCopyTextToClipboard(answer);
                    });
                  } else {
                    fallbackCopyTextToClipboard(answer);
                  }
                }}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                style={{
                  cursor: 'pointer',
                  transition: 'stroke 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.stroke = '#310080'}
                onMouseLeave={(e) => e.currentTarget.style.stroke = 'white'}
                title="Copy to clipboard"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <svg
                onClick={() => {
                  setFlashMessageText('The words arrive in harmony\nwith the moment.');
                  setShowFlashMessage(true);
                  setTimeout(() => setShowFlashMessage(false), 2000);
                }}
                width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"
                style={{
                  cursor: 'pointer',
                  transition: 'stroke 0.2s ease, fill 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.stroke = '#310080'; e.currentTarget.style.fill = '#310080'; }}
                onMouseLeave={(e) => { e.currentTarget.style.stroke = 'white'; e.currentTarget.style.fill = 'white'; }}
                title="Good response"
              >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
              <svg
                onClick={() => {
                  setFlashMessageText('The words stir turbulence\nwhere stillness was sought.');
                  setShowFlashMessage(true);
                  setTimeout(() => setShowFlashMessage(false), 2000);
                }}
                width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"
                style={{
                  cursor: 'pointer',
                  transition: 'stroke 0.2s ease, fill 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.stroke = '#310080'; e.currentTarget.style.fill = '#310080'; }}
                onMouseLeave={(e) => { e.currentTarget.style.stroke = 'white'; e.currentTarget.style.fill = 'white'; }}
                title="Poor response"
              >
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
              </svg>
              <svg
                onClick={() => setShowShareMenu(!showShareMenu)}
                width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"
                style={{
                  cursor: 'pointer',
                  transition: 'stroke 0.2s ease, fill 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.stroke = '#310080'; e.currentTarget.style.fill = '#310080'; }}
                onMouseLeave={(e) => { e.currentTarget.style.stroke = 'white'; e.currentTarget.style.fill = 'white'; }}
                title="Share response"
              >
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            </div>
          </div>
        )}
        
        {/* Share Menu */}
        {showShareMenu && answer && (
          <div style={{
            position: 'relative',
            maxWidth: isMobile ? '90vw' : '500px',
            width: isMobile ? '100%' : 'auto',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '48px',
              backgroundColor: 'rgba(255,255,255,0.9)',
              borderRadius: '8px',
              padding: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              zIndex: 100
            }}>
              <button
                onClick={async () => {
                  // Only allow sharing of AI-generated responses
                  if (!validResponses.has(answer)) {
                    alert('The winds of truth cannot be tampered with.');
                    setShowShareMenu(false);
                    return;
                  }
                  
                  console.log('Share button clicked, window width:', window.innerWidth);
                  const shareUrl = await createShareableUrl(lastQuestion, answer);
                  
                  if (!shareUrl) {
                    alert('Failed to create share link. Please try again.');
                    setShowShareMenu(false);
                    return;
                  }
                  console.log('Share URL created:', shareUrl);
                  
                  if (window.innerWidth < 768) {
                    // WhatsApp share for mobile
                    const text = `${lastQuestion}\n\n${answer}\n\nCheck out: ${shareUrl}`;
                    console.log('Sharing to WhatsApp:', text);
                    
                    // Try multiple approaches
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: 'Wisdom from minnebo.ai',
                          text: text
                        });
                        console.log('Native share successful');
                      } catch (error) {
                        console.log('Native share failed, trying WhatsApp URL');
                        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                        window.location.href = whatsappUrl;
                      }
                    } else {
                      console.log('No native share, using WhatsApp URL');
                      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                      window.location.href = whatsappUrl;
                    }
                  } else {
                    // Copy to clipboard for desktop
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        setFlashMessageText('The link flows\ninto your vessel.');
                        setShowFlashMessage(true);
                        setTimeout(() => setShowFlashMessage(false), 2000);
                      } catch (error) {
                        fallbackCopyTextToClipboard(shareUrl);
                      }
                    } else {
                      fallbackCopyTextToClipboard(shareUrl);
                    }
                  }
                  
                  setShowShareMenu(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#200F3B',
                  borderRadius: '4px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {window.innerWidth < 768 ? 'Share to WhatsApp' : 'Copy Link'}
              </button>
            </div>
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