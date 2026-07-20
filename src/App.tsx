import { useEffect, useRef, useState } from 'react';
import {
  ChallengeRequiredError,
  createShare,
  fetchShared,
  sendFeedback,
  streamChat,
  type Challenge,
  type LengthPref,
  type Tone,
} from './lib/api.ts';
import { updateMetaTags } from './lib/meta.ts';
import { useHistory, type HistoryItem } from './hooks/useHistory.ts';
import { Planet } from './components/Planet.tsx';
import { Wordmark } from './components/Wordmark.tsx';
import { ChatInput } from './components/ChatInput.tsx';
import { ToneRow } from './components/ToneRow.tsx';
import { AnswerView } from './components/AnswerView.tsx';
import { HistoryPanel } from './components/HistoryPanel.tsx';
import { FlashToast } from './components/FlashToast.tsx';
import { ChallengeCard } from './components/ChallengeCard.tsx';
import { SnakeGame } from './components/SnakeGame.tsx';

/** Accent color per tone — loud, flat, printable. */
const TONE_ACCENTS: Record<Tone, string> = {
  zen: '#12d7c6',
  guide: '#2b4bff',
  stoic: '#ff6200',
  sufi: '#ff2e88',
  plain: '#ffe600',
};

type Phase = 'idle' | 'thinking' | 'streaming' | 'done';

function App() {
  const [input, setInput] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [tone, setTone] = useState<Tone>('zen');
  const [length, setLength] = useState<LengthPref>('auto');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [showSnake, setShowSnake] = useState(false);
  const shareIdRef = useRef<string | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const history = useHistory();

  const onHeroMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', String((e.clientX - rect.left) / rect.width - 0.5));
    el.style.setProperty('--my', String((e.clientY - rect.top) / rect.height - 0.5));
  };

  const onHeroLeave = () => {
    const el = heroRef.current;
    if (!el) return;
    el.style.setProperty('--mx', '0');
    el.style.setProperty('--my', '0');
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--accent', TONE_ACCENTS[tone]);
  }, [tone]);

  // Load a shared conversation from ?share=<uuid>
  useEffect(() => {
    const shareId = new URLSearchParams(window.location.search).get('share');
    if (!shareId) return;
    fetchShared(shareId)
      .then((data) => {
        if (!data) return;
        setQuestion(data.question);
        setAnswer(data.answer);
        setPhase('done');
        shareIdRef.current = shareId;
        updateMetaTags(data.question, data.answer, shareId);
        window.history.replaceState({}, document.title, window.location.pathname);
      })
      .catch(() => {
        // fail silently, as before
      });
  }, []);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2000);
  };

  const copyText = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      flash(message);
    } catch {
      window.prompt('Copy this:', text);
    }
  };

  const ensureShareId = async (): Promise<string | null> => {
    if (shareIdRef.current) return shareIdRef.current;
    try {
      const { id } = await createShare(question, answer);
      shareIdRef.current = id;
      return id;
    } catch {
      return null;
    }
  };

  const handleSend = async (override?: string) => {
    const message = (override ?? input).trim();
    if (!message) return;

    if (message.toLowerCase() === 'snake') {
      setShowSnake(true);
      setInput('');
      return;
    }

    setQuestion(message);
    setInput('');
    setAnswer('');
    setPhase('thinking');
    shareIdRef.current = null;

    try {
      const result = await streamChat({
        message,
        tone,
        length,
        challenge:
          challenge && challengeAnswer
            ? { challengeId: challenge.challengeId, challengeAnswer }
            : undefined,
        onChunk: (full) => {
          setPhase('streaming');
          setAnswer(full);
        },
      });
      setChallenge(null);
      setChallengeAnswer('');
      setPhase('done');
      history.add(message, result);
      updateMetaTags(message, result, shareIdRef.current);
    } catch (error) {
      if (error instanceof ChallengeRequiredError) {
        setChallenge(error.challenge);
        setPhase('idle');
        return;
      }
      setAnswer(error instanceof Error && error.message ? error.message : 'Connection error. Please try again.');
      setPhase('done');
    }
  };

  const selectFromHistory = (item: HistoryItem) => {
    setQuestion(item.question);
    setAnswer(item.answer);
    setPhase('done');
    shareIdRef.current = null;
    updateMetaTags(item.question, item.answer);
  };

  if (showSnake) {
    return <SnakeGame onExit={() => setShowSnake(false)} />;
  }

  return (
    <>
      <nav className="corner-nav">
        <button
          className={`corner-link ${historyOpen ? 'active' : ''}`}
          onClick={() => setHistoryOpen(!historyOpen)}
          aria-pressed={historyOpen}
        >
          history
        </button>
      </nav>

      <div className="page">
        <div className="stage">
          <div className="hero" ref={heroRef} onMouseMove={onHeroMove} onMouseLeave={onHeroLeave}>
            <Planet
              accent={TONE_ACCENTS[tone]}
              pulse={pulse}
              excited={phase === 'thinking' || phase === 'streaming'}
            />
            <Wordmark />
          </div>

          <ChatInput
            value={input}
            placeholder="Cast your question into the flow…"
            onChange={(value) => {
              setInput(value);
              setPulse((p) => p + 1);
            }}
            onSend={() => handleSend()}
          />

          <ToneRow tone={tone} length={length} onTone={setTone} onLength={setLength} />

          {challenge && (
            <ChallengeCard
              challenge={challenge}
              answer={challengeAnswer}
              onAnswer={setChallengeAnswer}
              onSubmit={() => handleSend(question)}
            />
          )}

          {phase === 'thinking' && (
            <div className="thinking" aria-label="Thinking">
              <span /><span /><span />
            </div>
          )}

          {answer && (phase === 'streaming' || phase === 'done') && (
            <AnswerView
              question={question}
              answer={answer}
              streaming={phase === 'streaming'}
              onCopy={() => copyText(answer, 'The wisdom flows\ninto your vessel.')}
              onVote={async (vote) => {
                flash(
                  vote === 'up'
                    ? 'The words arrive in harmony\nwith the moment.'
                    : 'The words stir turbulence\nwhere stillness was sought.',
                );
                const id = await ensureShareId();
                if (id) sendFeedback(id, vote);
              }}
              onShare={async () => {
                const id = await ensureShareId();
                return id ? `https://minnebo-ai.vercel.app/api/redirect?share=${id}` : null;
              }}
              onRetry={() => handleSend(question)}
              onCopied={flash}
            />
          )}
        </div>
      </div>

      {historyOpen && (
        <HistoryPanel
          items={history.items}
          sorted={history.sorted}
          onSelect={selectFromHistory}
          onTogglePin={history.togglePin}
          onRemove={history.remove}
          onClear={history.clear}
          onCopy={(item) =>
            copyText(`Q: ${item.question}\n\nA: ${item.answer}`, 'The wisdom flows\ninto your vessel.')
          }
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {toast && <FlashToast message={toast} />}
    </>
  );
}

export default App;
