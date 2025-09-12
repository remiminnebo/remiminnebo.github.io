import logo from './logo.svg';
import { useState, useEffect, useRef } from 'react';

function App(): JSX.Element {
  const API_BASE = (process.env.REACT_APP_API_BASE as string)
    || (typeof window !== 'undefined' && /minnebo\.ai$/i.test(window.location.host) ? 'https://minnebo-ai.vercel.app' : '');
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
  const [challenge, setChallenge] = useState<{challengeId: string, question: string} | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [tone, setTone] = useState<'zen' | 'guide' | 'stoic' | 'sufi' | 'plain'>('zen');
  const [lengthPref, setLengthPref] = useState<'short' | 'long' | 'auto'>('auto');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<{ id: string, question: string, answer: string, pinned?: boolean, ts: number }[]>([]);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyAnimatingOut, setHistoryAnimatingOut] = useState(false);
  const [historyFocusIdx, setHistoryFocusIdx] = useState(0);
  const historyListRef = useRef<HTMLDivElement | null>(null);
  const historyItemRefs = useRef<(HTMLDivElement | null)[]>([]);
  // follow-up removed
  const [lastShareId, setLastShareId] = useState<string | null>(null);
  const shareMenuRef = useRef<HTMLDivElement | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const answerBlockRef = useRef<HTMLDivElement | null>(null);
  const leftActionsRef = useRef<HTMLDivElement | null>(null);
  // rightActionsRef removed (no right cluster)
  const [minAnswerWidth, setMinAnswerWidth] = useState<number>(0);
  const [contentWidth, setContentWidth] = useState<number | undefined>(undefined);
  const [chatWidth, setChatWidth] = useState<number | undefined>(undefined);
  const [controlsOpen, setControlsOpen] = useState(false);

  // Fancy pill-style button styling for selectors
  const toneGradients: Record<string, [string, string]> = {
    // Strong brand-forward gradients
    zen: ['#44FF06', '#8DF28F'],        // vibrant greens
    guide: ['#03BFF3', '#310080'],      // cyan → deep purple
    stoic: ['#310080', '#4609A8'],      // deep purples
    sufi: ['#FF0095', '#FF0004'],       // magenta → red
    plain: ['#03BFF3', '#FFFFFF']       // cyan → white
  };
  const lengthGradients: Record<string, [string, string]> = {
    auto: ['#03BFF3', '#310080'],       // cyan → deep purple
    short: ['#44FF06', '#8DF28F'],      // greens
    long: ['#FF0095', '#FF0004']        // magenta → red
  };

  const pill = (active: boolean, grad?: [string, string]) => {
    if (active && grad) {
      const [g1, g2] = grad;
      return {
        padding: '6px 12px',
        borderRadius: '999px',
        border: '2px solid transparent',
        backgroundColor: '#FFFFFF',
        backgroundImage: `linear-gradient(#FFFFFF, #FFFFFF), linear-gradient(135deg, ${g1}, ${g2})`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        color: '#200F3B',
        cursor: 'pointer',
        fontWeight: 'bold' as const,
        boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
        transition: 'all 0.18s ease-in-out',
        transform: 'translateZ(0)'
      } as const;
    }
    return {
      padding: '6px 12px',
      borderRadius: '999px',
      border: '1px solid rgba(255,255,255,0.7)',
      background: 'rgba(255,255,255,0.12)',
      color: 'white',
      cursor: 'pointer',
      fontWeight: 'bold' as const,
      boxShadow: 'none',
      transition: 'all 0.18s ease-in-out'
    } as const;
  };
  const pillGroup = {
    display: 'flex',
    gap: '6px',
    padding: '6px',
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.35)'
  } as const;

  // Small inline icons (no emojis)
  const IconLeaf = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ marginRight: 6 }}>
      <path d="M5 21c8 0 14-6 14-14 0 0-9 0-14 5s-5 14-5 14z"/>
    </svg>
  );
  const IconCompass = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ marginRight: 6 }}>
      <circle cx="12" cy="12" r="10"/><polygon points="16 8 8 10 10 16 16 8"/>
    </svg>
  );
  const IconColumn = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ marginRight: 6 }}>
      <path d="M4 7h16M6 7v13m12-13v13M8 20h8"/>
    </svg>
  );
  const IconSwirl = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ marginRight: 6 }}>
      <path d="M21 12a9 9 0 1 1-9-9c3 0 5 2 5 5 0 2-1 3-3 3-3 0-4-4-1-5"/>
    </svg>
  );
  const IconText = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ marginRight: 6 }}>
      <path d="M4 6h16M4 12h10M4 18h14"/>
    </svg>
  );
  const IconWand = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ marginRight: 6 }}>
      <path d="M6 18L18 6M14 6h4v4"/>
    </svg>
  );
  const IconShort = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ marginRight: 6 }}>
      <path d="M4 8h8M4 14h6"/>
    </svg>
  );
  const IconLong = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ marginRight: 6 }}>
      <path d="M4 6h12M4 12h14M4 18h10"/>
    </svg>
  );
  // Follow-up removed

  const IconChevron = ({ open }: { open: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ marginLeft: 8, transition: 'transform 0.18s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  const summaryText = () => {
    const toneLabel = ({ zen: 'Zen', guide: 'Guide', stoic: 'Stoic', sufi: 'Sufi', plain: 'Plain' } as const)[tone];
    const lengthLabel = lengthPref === 'auto' ? 'Auto' : lengthPref === 'short' ? 'Short' : 'Long';
    return `${toneLabel} • ${lengthLabel}`;
  };

  // Keep customize menu open slightly longer after selection
  const controlsCloseTimer = useRef<number | null>(null);
  const scheduleControlsClose = (delay = 1200) => {
    if (controlsCloseTimer.current) {
      window.clearTimeout(controlsCloseTimer.current);
    }
    controlsCloseTimer.current = window.setTimeout(() => {
      setControlsOpen(false);
      controlsCloseTimer.current = null;
    }, delay);
  };

  const selectTone = (t: 'zen' | 'guide' | 'stoic' | 'sufi' | 'plain') => {
    setTone(t);
    scheduleControlsClose(1200);
  };
  const selectLength = (l: 'auto' | 'short' | 'long') => {
    setLengthPref(l);
    scheduleControlsClose(1200);
  };

  const closeHistory = () => {
    if (!historyOpen) return;
    setHistoryAnimatingOut(true);
    setTimeout(() => {
      setHistoryAnimatingOut(false);
      setHistoryOpen(false);
    }, 200);
  };

  // Focus and keyboard navigation for history
  useEffect(() => {
    if (historyOpen && historyListRef.current) {
      historyListRef.current.focus();
      setHistoryFocusIdx(0);
    }
  }, [historyOpen, historyQuery]);

  useEffect(() => {
    if (!historyOpen) return;
    const el = historyItemRefs.current[historyFocusIdx];
    if (el && 'scrollIntoView' in el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [historyFocusIdx, historyOpen]);

  const handleHistoryKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const filtered = history
      .slice()
      .sort((a, b) => (Number(!!b.pinned) - Number(!!a.pinned)) || (b.ts - a.ts))
      .filter(item => {
        const q = historyQuery.trim().toLowerCase();
        if (!q) return true;
        return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
      });
    if (!filtered.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHistoryFocusIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHistoryFocusIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHistoryFocusIdx(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHistoryFocusIdx(filtered.length - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[historyFocusIdx];
      if (item) {
        setLastQuestion(item.question);
        setAnswer(item.answer);
        setIsAnswerComplete(true);
        setShowShareMenu(false);
        setLastShareId(null);
        updateMetaTags(item.question, item.answer);
        closeHistory();
      }
    }
  };

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

  const handleVote = async (vote: 'up' | 'down') => {
    try {
      let id = lastShareId;
      if (!id && lastQuestion && answer) {
        const url = await createShareableUrl(lastQuestion, answer);
        const shareParam = url ? new URL(url).searchParams.get('share') : null;
        if (shareParam) id = shareParam;
      }
      if (!id) return;
      await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, vote })
      });
    } catch (e) {
      // non-blocking
    }
  };

  const createShareableUrl = async (question: string, answer: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/secure-store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, answer })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create share link');
      }
      
      const data = await response.json();
      if (data.id) {
        setLastShareId(data.id);
        const base = (process.env.REACT_APP_SHARE_BASE as string) || 'https://minnebo-ai.vercel.app/api/redirect';
        return `${base}?share=${data.id}`;
      }
    } catch (error) {
      console.error('Failed to create share link:', error);
      throw error;
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
      
      const { default: html2canvas } = await import('html2canvas');
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
    // First escape HTML to prevent XSS
    const escapeHtml = (str: string) => {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    };
    
    // Escape the entire text first
    const escaped = escapeHtml(text);
    
    // Then apply markdown formatting to the escaped text
    return escaped
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

  // Load conversation history
  useEffect(() => {
    try {
      const raw = localStorage.getItem('minnebo_history');
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  const persistHistory = (items: { id: string, question: string, answer: string, pinned?: boolean, ts: number }[]) => {
    setHistory(items);
    try { localStorage.setItem('minnebo_history', JSON.stringify(items.slice(0, 50))); } catch {}
  };

  const updateMetaTags = (question: string, answer: string) => {
    // Sanitize content for title and meta tags
    const sanitizeText = (text: string) => {
      return text.replace(/[<>&"']/g, (match) => {
        const entities: { [key: string]: string } = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' };
        return entities[match] || match;
      }).trim();
    };
    
    const safeQuestion = sanitizeText(question);
    const safeAnswer = sanitizeText(answer);
    
    document.title = `${safeQuestion} - minnebo.ai`;
    
    const updateMeta = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('property', property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };
    
    const imageUrl = lastShareId
      ? `${window.location.origin}/api/og-image?id=${encodeURIComponent(lastShareId)}`
      : `https://minnebo-ai.vercel.app/api/og-image`;
    
    updateMeta('og:title', safeQuestion);
    updateMeta('og:description', safeAnswer.substring(0, 200) + (safeAnswer.length > 200 ? '...' : ''));
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
      // Validate UUID format before making request
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(shareId)) {
        // Try to fetch from secure storage
        fetch(`${API_BASE}/api/secure-store?id=${shareId}`)
          .then(response => {
            if (!response.ok) {
              throw new Error('Failed to load conversation');
            }
            return response.json();
          })
          .then(data => {
            if (data.question && data.answer) {
              setLastQuestion(data.question);
              setAnswer(data.answer);
              setIsAnswerComplete(true);
              setLastShareId(shareId);
              updateMetaTags(data.question, data.answer);
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch(error => {
            console.error('Failed to load shared conversation:', error);
            // Don't show error to user, just fail silently
          });
      }
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

  // Close share menu on outside click / Escape
  useEffect(() => {
    function computeMinAnswerWidth() {
      const lw = leftActionsRef.current?.offsetWidth || 0;
      const padding = 24; // breathing room
      const desired = lw + padding;
      // Cap to our max content width
      const cap = isMobile ? Math.floor(window.innerWidth * 0.9) : 700;
      setMinAnswerWidth(Math.min(desired, cap));
    }

    computeMinAnswerWidth();
    const onResize = () => computeMinAnswerWidth();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isMobile, isAnswerComplete, answer, showShareMenu]);

  // Keep chat and answer sharing the same centered width
  useEffect(() => {
    const cap = isMobile ? Math.floor(window.innerWidth * 0.9) : 700;
    const cw = Math.min((chatWidth || cap), cap);
    const width = Math.max(minAnswerWidth || 0, cw);
    setContentWidth(width);
  }, [chatWidth, minAnswerWidth, isMobile]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const el = shareMenuRef.current;
      if (showShareMenu && el && !el.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowShareMenu(false);
        setFollowUpOpen(false);
        setControlsOpen(false);
        closeHistory();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
      if (controlsCloseTimer.current) {
        window.clearTimeout(controlsCloseTimer.current);
        controlsCloseTimer.current = null;
      }
    };
  }, [showShareMenu]);

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

  const handleSend = async (overrideMessage?: string) => {
    if ((overrideMessage && overrideMessage.trim()) || input.trim()) {
      if (input.toLowerCase() === 'snake') {
        setShowSnake(true);
        setInput('');
        return;
      }
      
      const userMessage = overrideMessage ? overrideMessage : input;
      setLastQuestion(userMessage);
      setInput('');
      setAnswer('');
      setIsTyping(true);
      setIsAnswerComplete(false);
      
      try {
        const requestBody: any = { message: userMessage, tone, length: lengthPref === 'auto' ? undefined : lengthPref };
        
        // Include challenge data if we have it
        if (challenge && challengeAnswer) {
          requestBody.challengeId = challenge.challengeId;
          requestBody.challengeAnswer = challengeAnswer;
        }
        
        const response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
          // Handle challenge response
          if (response.status === 429) {
            try {
              const errorData = await response.json();
              if (errorData.challenge) {
                setChallenge({
                  challengeId: errorData.challenge.challengeId,
                  question: errorData.challenge.question
                });
                setAnswer('');
                setIsTyping(false);
                return;
              }
            } catch (e) {
              // Fallback for non-JSON responses
            }
          }
          
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
          // Clear challenge on successful response
          setChallenge(null);
          setChallengeAnswer('');
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              setIsAnswerComplete(true);
              // Save to history
              const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
              const item = { id, question: userMessage, answer: result, ts: Date.now() };
              // Keep existing items (including pinned) after the newest
              persistHistory([item, ...history]);
              break;
            }
            
            const chunk = decoder.decode(value, { stream: true });
            result += chunk;
            setAnswer(result);
          }
        }
      } catch (error) {
        console.error('Fetch error:', error);
        setAnswer('Connection error. Please try again.');
        setIsTyping(false);
      }
    }
  };

  const chatShell = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '6px',
    borderRadius: '16px',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.35)',
    boxShadow: '0 6px 14px rgba(0,0,0,0.12)',
    backdropFilter: 'blur(4px)',
    margin: '0 auto'
  } as const;

  const inputPill = {
    flex: 1,
    minWidth: '220px',
    padding: '10px 14px',
    borderRadius: '12px',
    border: '2px solid transparent',
    backgroundColor: '#FFFFFF',
    backgroundImage: 'linear-gradient(#FFFFFF, #FFFFFF), linear-gradient(135deg, #03BFF3, #310080)',
    backgroundOrigin: 'border-box',
    backgroundClip: 'padding-box, border-box',
    fontSize: '16px',
    fontWeight: 'bold',
    fontFamily: 'Tahoma, sans-serif',
    outline: 'none',
    color: '#200F3B' 
  } as const;

  const sendPill = (hovered: boolean) => {
    const fill = hovered ? '#00C7EB' : '#200F3B';
    return {
      padding: '10px 16px',
      minWidth: '52px',
      borderRadius: '12px',
      border: '2px solid transparent',
      backgroundImage: `linear-gradient(${fill}, ${fill}), linear-gradient(135deg, #03BFF3, #310080)`,
      backgroundOrigin: 'border-box',
      backgroundClip: 'padding-box, border-box',
      color: 'white',
      cursor: 'pointer',
      fontWeight: 'bold',
      fontFamily: 'Tahoma, sans-serif',
      fontSize: '18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
      transition: 'transform 0.12s ease, filter 0.12s ease',
      transform: hovered ? 'translateY(-1px)' : 'translateY(0)'
    } as const;
  };

  const widthSizerRef = useRef<HTMLDivElement | null>(null);
  const heightSizerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [inputHeight, setInputHeight] = useState<number | undefined>(undefined);
  const inputPlaceholder = lastQuestion || "Cast your question into the flow...";

  const measureAndSetWidth = () => {
    if (!widthSizerRef.current) return;
    const content = (input || inputPlaceholder) + ' ';
    widthSizerRef.current.textContent = content;
    const textW = widthSizerRef.current.offsetWidth;
    const sendAndGaps = 52 + 8; // approx send button width + gap
    const shellPadding = 12; // left+right padding of shell
    const extra = 24; // breathing room
    const minW = 360;
    const maxW = Math.min((isMobile ? window.innerWidth - 32 : 1000), 1200);
    const desired = Math.min(Math.max(minW, textW + sendAndGaps + shellPadding + extra), maxW);
    setChatWidth(desired);
  };

  const measureAndSetHeight = () => {
    const max = 180; // allow multiline up to ~6 lines
    const el = inputRef.current;
    const s = heightSizerRef.current;
    if (!el || !s) return;
    // Mirror content into sizer to measure total height including padding
    s.textContent = (input || inputPlaceholder) + ' ';
    const needed = Math.min(s.offsetHeight, max);
    setInputHeight(needed);
  };

  useEffect(() => {
    measureAndSetWidth();
    measureAndSetHeight();
  }, [input, inputPlaceholder, isMobile]);
  useEffect(() => {
    const onResize = () => { measureAndSetWidth(); measureAndSetHeight(); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const chatInput = (
    <div style={chatShell as any}>
      {/* Hidden sizers: width (no wrap) and height (wrap) */}
      <div
        ref={widthSizerRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          zIndex: -1,
          whiteSpace: 'pre',
          boxSizing: 'border-box',
          // mirror textarea style
          padding: (inputPill as any).padding,
          fontSize: (inputPill as any).fontSize,
          fontWeight: (inputPill as any).fontWeight,
          fontFamily: (inputPill as any).fontFamily,
          border: (inputPill as any).border,
          borderRadius: (inputPill as any).borderRadius,
        }}
      >
        {(input || inputPlaceholder) + ' '}
      </div>
      <div
        ref={heightSizerRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          visibility: 'hidden',
          zIndex: -1,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          boxSizing: 'border-box',
          width: '100%',
          padding: (inputPill as any).padding,
          fontSize: (inputPill as any).fontSize,
          fontWeight: (inputPill as any).fontWeight,
          fontFamily: (inputPill as any).fontFamily,
          lineHeight: 1.25,
          border: (inputPill as any).border,
          borderRadius: (inputPill as any).borderRadius,
        }}
      >
        {(input || inputPlaceholder) + ' '}
      </div>
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
        }}
        placeholder={inputPlaceholder}
        className="thick-cursor"
        aria-label="Ask a question"
        rows={1}
        style={{
          ...(inputPill as any),
          resize: 'none',
          lineHeight: 1.25,
          width: '100%',
          boxSizing: 'border-box',
          height: inputHeight ? `${inputHeight}px` : undefined,
          overflow: inputHeight && inputHeight >= 180 ? 'auto' : 'hidden'
        }}
      />
      <button
        onClick={handleSend}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Send question"
        style={sendPill(isHovered) as any}
      >
        ➤
      </button>
    </div>
  );

  // Shared frame to keep input and answer centered together
  const frameStyle = {
    width: contentWidth ? `${contentWidth}px` : 'auto',
    maxWidth: isMobile ? '90vw' : '700px',
    margin: '0 auto'
  } as const;

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
      {/* History Panel */}
      {(historyOpen || historyAnimatingOut) && (
        <>
          {/* Dim overlay */}
          <div onClick={closeHistory} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', zIndex: 1100, opacity: historyOpen ? 1 : 0, transition: 'opacity 0.2s ease' }} />
          {/* Glass panel */}
          <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: isMobile ? '88vw' : '360px', zIndex: 1110, padding: '16px', transform: historyOpen ? 'translate(0,0)' : (isMobile ? 'translate(0, 16px)' : 'translate(-16px, 0)'), opacity: historyOpen ? 1 : 0, transition: 'transform 0.2s ease, opacity 0.2s ease' }}>
            <div
              tabIndex={0}
              ref={historyListRef}
              onKeyDown={handleHistoryKey}
              style={{
                height: '100%',
                borderRadius: '16px',
                backgroundColor: 'rgba(255,255,255,0.55)',
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.66), rgba(255,255,255,0.4))',
                boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                border: '2px solid transparent',
                backgroundClip: 'padding-box, border-box',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* macOS traffic lights */}
                  <div role="group" aria-label="Window controls" style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={closeHistory}
                      title="Close"
                      aria-label="Close"
                      style={{ width: 12, height: 12, borderRadius: '50%', background: '#FF5F57', border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer' }}
                    />
                    <button
                      onClick={closeHistory}
                      title="Minimize"
                      aria-label="Minimize"
                      style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFBD2E', border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer' }}
                    />
                    <button
                      onClick={closeHistory}
                      title="Zoom"
                      aria-label="Zoom"
                      style={{ width: 12, height: 12, borderRadius: '50%', background: '#28C840', border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer' }}
                    />
                  </div>
                  <strong style={{ color: '#200F3B' }}>History</strong>
                  <span style={{ fontSize: 12, color: '#555' }}>({history.length})</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button onClick={() => { persistHistory([]); }} disabled={history.length === 0} title="Clear all" aria-label="Clear all"
                    style={{ border: 'none', background: 'transparent', color: history.length ? '#310080' : '#aaa', cursor: history.length ? 'pointer' : 'default' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>

              {/* Search */}
              <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <input
                  placeholder="Search history..."
                  aria-label="Search history"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(0,0,0,0.12)', outline: 'none' }}
                />
              </div>

              {/* List */}
              <div style={{ overflowY: 'auto', padding: '8px 10px', flex: 1 }}>
                {history.length === 0 && <div style={{ color: '#555', padding: '12px' }}>No conversations yet.</div>}
                {history
                  .slice()
                  .sort((a, b) => (Number(!!b.pinned) - Number(!!a.pinned)) || (b.ts - a.ts))
                  .filter(item => {
                    const q = historyQuery.trim().toLowerCase();
                    if (!q) return true;
                    return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q);
                  })
                  .map((item, idx) => (
                    <div
                      key={item.id}
                      ref={el => (historyItemRefs.current[idx] = el)}
                      role="option"
                      aria-selected={historyFocusIdx === idx}
                      style={{ background: 'rgba(255,255,255,0.85)', border: historyFocusIdx === idx ? '2px solid #03BFF3' : '1px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: 10, marginBottom: 8, boxShadow: historyFocusIdx === idx ? '0 6px 16px rgba(0,0,0,0.10)' : '0 4px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', minWidth: 0 }}>
                        <button
                          onClick={() => {
                            setLastQuestion(item.question);
                            setAnswer(item.answer);
                            setIsAnswerComplete(true);
                            setShowShareMenu(false);
                            setLastShareId(null);
                            updateMetaTags(item.question, item.answer);
                          }}
                          style={{ flex: 1, minWidth: 0, textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', color: '#200F3B', padding: 0 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            {item.pinned && (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="#310080" stroke="#310080" strokeWidth="0" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                            )}
                            <div style={{ fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.question}</div>
                          </div>
                          <div style={{ fontSize: 12, color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{item.answer}</div>
                          <div style={{ fontSize: 11, color: '#777', marginTop: 4 }}>{new Date(item.ts).toLocaleString()}</div>
                        </button>
                        <div style={{ display: 'flex', alignItems: 'start', gap: 6 }}>
                          <button
                            title="Copy"
                            onClick={() => {
                              const text = `Q: ${item.question}\n\nA: ${item.answer}`;
                              if (navigator.clipboard && navigator.clipboard.writeText) {
                                navigator.clipboard.writeText(text).catch(() => fallbackCopyTextToClipboard(text));
                              } else {
                                fallbackCopyTextToClipboard(text);
                              }
                            }}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#200F3B' }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                          </button>
                          <button
                            aria-pressed={!!item.pinned}
                            onClick={() => {
                              const updated = history.map(h => h.id === item.id ? { ...h, pinned: !h.pinned } : h);
                              persistHistory(updated);
                            }}
                            title={item.pinned ? 'Unpin' : 'Pin'}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: item.pinned ? '#310080' : '#888' }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
                          </button>
                          <button
                            title="Delete"
                            onClick={() => {
                              const updated = history.filter(h => h.id !== item.id);
                              persistHistory(updated);
                            }}
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#C22' }}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
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
        
        <div style={frameStyle as any}>
          {!isMobile && (
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button aria-expanded={controlsOpen} onClick={() => setControlsOpen(!controlsOpen)} style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.12)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                    Customize: {summaryText()} <IconChevron open={controlsOpen} />
                  </button>
                  <button onClick={() => setHistoryOpen(!historyOpen)} aria-pressed={historyOpen} aria-label="Toggle history" style={{ padding: '8px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.6)', fontWeight: 'bold', background: 'rgba(255,255,255,0.12)', color: 'white' }}>History</button>
                </div>
                {controlsOpen && (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <div role="group" aria-label="Tone" style={pillGroup as any}>
                      <button aria-pressed={tone==='zen'} onClick={() => selectTone('zen')} style={pill(tone === 'zen', toneGradients.zen)}><IconLeaf />Zen</button>
                      <button aria-pressed={tone==='guide'} onClick={() => selectTone('guide')} style={pill(tone === 'guide', toneGradients.guide)}><IconCompass />Guide</button>
                      <button aria-pressed={tone==='stoic'} onClick={() => selectTone('stoic')} style={pill(tone === 'stoic', toneGradients.stoic)}><IconColumn />Stoic</button>
                      <button aria-pressed={tone==='sufi'} onClick={() => selectTone('sufi')} style={pill(tone === 'sufi', toneGradients.sufi)}><IconSwirl />Sufi</button>
                      <button aria-pressed={tone==='plain'} onClick={() => selectTone('plain')} style={pill(tone === 'plain', toneGradients.plain)}><IconText />Plain</button>
                    </div>
                    <div role="group" aria-label="Length" style={pillGroup as any}>
                      <button aria-pressed={lengthPref==='auto'} onClick={() => selectLength('auto')} style={pill(lengthPref === 'auto', lengthGradients.auto)}><IconWand />Auto</button>
                      <button aria-pressed={lengthPref==='short'} onClick={() => selectLength('short')} style={pill(lengthPref === 'short', lengthGradients.short)}><IconShort />Short</button>
                      <button aria-pressed={lengthPref==='long'} onClick={() => selectLength('long')} style={pill(lengthPref === 'long', lengthGradients.long)}><IconLong />Long</button>
                    </div>
                  </div>
                )}
                {chatInput}
              </div>
            </div>
          )}
        
        {/* Challenge UI */}
        {challenge && (
          <div style={{
            backgroundColor: 'rgba(255, 200, 100, 0.9)',
            padding: '20px',
            borderRadius: '12px',
            fontSize: '18px',
            maxWidth: isMobile ? '90vw' : '500px',
            width: isMobile ? '100%' : 'auto',
            color: '#8B4513',
            marginBottom: '20px',
            border: '2px solid #FF8C00'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>
              Security Check Required
            </div>
            <div style={{ marginBottom: '15px' }}>
              Please solve: {challenge.question} = ?
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="number"
                value={challengeAnswer}
                onChange={(e) => setChallengeAnswer(e.target.value)}
                placeholder="Answer"
                style={{
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #DDD',
                  fontSize: '16px',
                  width: '80px'
                }}
              />
              <button
                onClick={() => {
                  if (challengeAnswer) {
                    handleSend(); // Retry with challenge answer
                  }
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#FF8C00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Submit
              </button>
            </div>
          </div>
        )}
        
        {/* Typing Indicator: simple three fading dots */}
        {isTyping && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundImage: 'linear-gradient(135deg, #03BFF3, #310080)',
              boxShadow: '0 0 10px rgba(49,0,128,0.45)',
              animation: 'pulse 1.2s ease-in-out infinite both',
              animationDelay: '0s'
            }} />
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundImage: 'linear-gradient(135deg, #FF0095, #FF0004)',
              boxShadow: '0 0 10px rgba(255,0,149,0.45)',
              animation: 'pulse 1.2s ease-in-out infinite both',
              animationDelay: '0.2s'
            }} />
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundImage: 'linear-gradient(135deg, #44FF06, #8DF28F)',
              boxShadow: '0 0 10px rgba(68,255,6,0.45)',
              animation: 'pulse 1.2s ease-in-out infinite both',
              animationDelay: '0.4s'
            }} />
          </div>
        )}
        
        {answer && (
          <div ref={answerBlockRef} style={{ position: 'relative', minWidth: minAnswerWidth ? `${minAnswerWidth}px` : undefined, width: '100%', maxWidth: '100%', margin: '12px auto 0' }}>
            <div 
              style={{
                padding: '16px',
                borderRadius: '12px',
                fontSize: '18px',
                lineHeight: '1.6',
                maxWidth: 'inherit',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'Tahoma, sans-serif',
                fontWeight: 'normal',
                color: '#200F3B',
                border: '2px solid transparent',
                backgroundColor: '#FFFFFF',
                backgroundImage: 'linear-gradient(#FFFFFF, #FFFFFF), linear-gradient(135deg, #03BFF3, #310080)',
                backgroundOrigin: 'border-box',
                backgroundClip: 'padding-box, border-box',
                boxShadow: '0 6px 16px rgba(0,0,0,0.12)'
              }}
              dangerouslySetInnerHTML={{ __html: parseMarkdown(answer) }}
            />
            {/* Actions bar */}
            <div style={{
              display: isAnswerComplete ? 'flex' : 'none',
              alignItems: 'center',
              justifyContent: 'flex-start',
              flexWrap: 'wrap',
              rowGap: '8px',
              columnGap: '12px',
              marginTop: '10px'
            }}>
              <div ref={leftActionsRef} style={{ display: 'flex', gap: '16px', flexShrink: 0, alignItems: 'center' }}>
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
                role="button" aria-label="Copy to clipboard" title="Copy to clipboard"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <svg
                onClick={() => {
                  setFlashMessageText('The words arrive in harmony\nwith the moment.');
                  setShowFlashMessage(true);
                  setTimeout(() => setShowFlashMessage(false), 2000);
                  handleVote('up');
                }}
                width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"
                style={{
                  cursor: 'pointer',
                  transition: 'stroke 0.2s ease, fill 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.stroke = '#310080'; e.currentTarget.style.fill = '#310080'; }}
                onMouseLeave={(e) => { e.currentTarget.style.stroke = 'white'; e.currentTarget.style.fill = 'white'; }}
                role="button" aria-label="Good response" title="Good response"
              >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
              </svg>
              <svg
                onClick={() => {
                  setFlashMessageText('The words stir turbulence\nwhere stillness was sought.');
                  setShowFlashMessage(true);
                  setTimeout(() => setShowFlashMessage(false), 2000);
                  handleVote('down');
                }}
                width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"
                style={{
                  cursor: 'pointer',
                  transition: 'stroke 0.2s ease, fill 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.stroke = '#310080'; e.currentTarget.style.fill = '#310080'; }}
                onMouseLeave={(e) => { e.currentTarget.style.stroke = 'white'; e.currentTarget.style.fill = 'white'; }}
                role="button" aria-label="Poor response" title="Poor response"
              >
                <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
              </svg>
              <svg
                onClick={async () => {
                  if (!showShareMenu) {
                    try {
                      const url = await createShareableUrl(lastQuestion, answer);
                      if (url) setShareLink(url);
                    } catch {
                      setShareLink(null);
                    }
                  }
                  setShowShareMenu(!showShareMenu);
                }}
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
              <svg
                onClick={() => handleSend(lastQuestion)}
                width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"
                style={{
                  cursor: 'pointer',
                  transition: 'stroke 0.2s ease, fill 0.2s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.stroke = '#310080'; e.currentTarget.style.fill = '#310080'; }}
                onMouseLeave={(e) => { e.currentTarget.style.stroke = 'white'; e.currentTarget.style.fill = 'white'; }}
                role="button" aria-label="Regenerate" title="Regenerate"
              >
                <path d="M6 18L18 6M14 6h4v4"></path>
              </svg>
              </div>
            </div>
          </div>
        )}
        
        {/* Share Menu */}
        {showShareMenu && answer && (
          <div style={{
            maxWidth: isMobile ? '90vw' : '700px',
            width: isMobile ? '100%' : 'auto',
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '8px'
          }}>
            <div ref={shareMenuRef} style={{
              borderRadius: '12px',
              border: '2px solid transparent',
              backgroundColor: '#FFFFFF',
              backgroundImage: 'linear-gradient(#FFFFFF, #FFFFFF), linear-gradient(135deg, #03BFF3, #310080)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              padding: '12px',
              minWidth: isMobile ? 'calc(90vw - 24px)' : '360px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.18)',
              zIndex: 120
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <strong style={{ color: '#200F3B' }}>Share</strong>
                <button onClick={() => setShowShareMenu(false)} aria-label="Close share" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#200F3B' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <input readOnly value={shareLink || ''} placeholder="Generating link..." style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.12)', color: '#200F3B' }} />
                <button
                  onClick={async () => {
                    try {
                      const url = shareLink || await createShareableUrl(lastQuestion, answer);
                      if (!url) throw new Error('No URL');
                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(url);
                      } else {
                        fallbackCopyTextToClipboard(url);
                      }
                      setFlashMessageText('The link flows\ninto your vessel.');
                      setShowFlashMessage(true);
                      setTimeout(() => setShowFlashMessage(false), 2000);
                    } catch (e) {
                      setFlashMessageText('The path to sharing\nremains clouded.');
                      setShowFlashMessage(true);
                      setTimeout(() => setShowFlashMessage(false), 2000);
                    }
                  }}
                  style={pill(true, toneGradients.guide) as any}
                >
                  Copy Link
                </button>
              </div>
              {isMobile && (
                <button
                  onClick={async () => {
                    try {
                      const url = shareLink || await createShareableUrl(lastQuestion, answer);
                      const text = `${lastQuestion}\n\n${answer}\n\nCheck out: ${url}`;
                      if (navigator.share) {
                        try {
                          await navigator.share({ title: 'Wisdom from minnebo.ai', text });
                        } catch {
                          window.location.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
                        }
                      } else {
                        window.location.href = `https://wa.me/?text=${encodeURIComponent(text)}`;
                      }
                      setShowShareMenu(false);
                    } catch (e) {
                      setFlashMessageText('The path to sharing\nremains clouded.');
                      setShowFlashMessage(true);
                      setTimeout(() => setShowFlashMessage(false), 2000);
                      setShowShareMenu(false);
                    }
                  }}
                  style={{ marginTop: 6, padding: '10px 12px', borderRadius: 10, border: 'none', background: '#25D366', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Share to WhatsApp
                </button>
              )}
            </div>
          </div>
        )}
        </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button aria-expanded={controlsOpen} onClick={() => setControlsOpen(!controlsOpen)} style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.14)', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                Customize: {summaryText()} <IconChevron open={controlsOpen} />
              </button>
            </div>
            {controlsOpen && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <div role="group" aria-label="Tone" style={pillGroup as any}>
                  <button aria-pressed={tone==='zen'} onClick={() => selectTone('zen')} style={pill(tone === 'zen', toneGradients.zen)}><IconLeaf />Zen</button>
                  <button aria-pressed={tone==='guide'} onClick={() => selectTone('guide')} style={pill(tone === 'guide', toneGradients.guide)}><IconCompass />Guide</button>
                  <button aria-pressed={tone==='stoic'} onClick={() => selectTone('stoic')} style={pill(tone === 'stoic', toneGradients.stoic)}><IconColumn />Stoic</button>
                  <button aria-pressed={tone==='sufi'} onClick={() => selectTone('sufi')} style={pill(tone === 'sufi', toneGradients.sufi)}><IconSwirl />Sufi</button>
                  <button aria-pressed={tone==='plain'} onClick={() => selectTone('plain')} style={pill(tone === 'plain', toneGradients.plain)}><IconText />Plain</button>
                </div>
                <div role="group" aria-label="Length" style={pillGroup as any}>
                  <button aria-pressed={lengthPref==='auto'} onClick={() => selectLength('auto')} style={pill(lengthPref === 'auto', lengthGradients.auto)}><IconWand />Auto</button>
                  <button aria-pressed={lengthPref==='short'} onClick={() => selectLength('short')} style={pill(lengthPref === 'short', lengthGradients.short)}><IconShort />Short</button>
                  <button aria-pressed={lengthPref==='long'} onClick={() => selectLength('long')} style={pill(lengthPref === 'long', lengthGradients.long)}><IconLong />Long</button>
                </div>
              </div>
            )}
            {chatInput}
          </div>
        </div>
      )}
    </div>
  );
}

// History panel component inside same file for simplicity

export default App;
