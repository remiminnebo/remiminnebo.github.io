import { useState } from 'react';
import { renderMarkdown } from '../lib/markdown.ts';
import { TextScramble } from './TextScramble.tsx';
import { IconCopy, IconRetry, IconShare, IconThumbDown, IconThumbUp } from './icons.tsx';

interface AnswerViewProps {
  question: string;
  answer: string;
  streaming: boolean;
  onCopy: () => void;
  onVote: (vote: 'up' | 'down') => void;
  onShare: () => Promise<string | null>;
  onRetry: () => void;
  onCopied: (message: string) => void;
}

export function AnswerView({
  question,
  answer,
  streaming,
  onCopy,
  onVote,
  onShare,
  onRetry,
  onCopied,
}: AnswerViewProps) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const toggleShare = async () => {
    if (shareOpen) {
      setShareOpen(false);
      return;
    }
    setShareOpen(true);
    if (!shareUrl) {
      const url = await onShare();
      setShareUrl(url);
    }
  };

  const copyShareLink = async () => {
    const url = shareUrl ?? (await onShare());
    if (!url) {
      onCopied('The path to sharing\nremains clouded.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      onCopied('The link flows\ninto your vessel.');
    } catch {
      window.prompt('Copy this link:', url);
    }
  };

  return (
    <div className="answer-wrap">
      <p className="q-echo">{question}</p>
      <div className="answer-body">
        {streaming ? (
          <>
            <span dangerouslySetInnerHTML={{ __html: renderMarkdown(answer) }} />
            <span className="stream-caret" />
          </>
        ) : (
          // Once streaming completes, decode the final text into place.
          <TextScramble>{answer}</TextScramble>
        )}
      </div>

      {!streaming && (
        <div className="actions">
          <button className="action-btn" onClick={onCopy} aria-label="Copy answer" title="Copy answer">
            <IconCopy />
          </button>
          <button className="action-btn" onClick={() => onVote('up')} aria-label="Good response" title="Good response">
            <IconThumbUp />
          </button>
          <button className="action-btn" onClick={() => onVote('down')} aria-label="Poor response" title="Poor response">
            <IconThumbDown />
          </button>
          <button className="action-btn" onClick={toggleShare} aria-label="Share" title="Share" aria-expanded={shareOpen}>
            <IconShare />
          </button>
          <button className="action-btn" onClick={onRetry} aria-label="Ask again" title="Ask again">
            <IconRetry />
          </button>
        </div>
      )}

      {shareOpen && !streaming && (
        <div className="share-card">
          <input readOnly value={shareUrl ?? ''} placeholder="Summoning link…" aria-label="Share link" />
          <button className="share-copy" onClick={copyShareLink}>
            Copy link
          </button>
        </div>
      )}
    </div>
  );
}
