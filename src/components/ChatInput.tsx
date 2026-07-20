import { useEffect, useRef } from 'react';

interface ChatInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({ value, placeholder, onChange, onSend }: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="ask">
      {/* the ::after of .grow-wrap mirrors the text to auto-size the textarea */}
      <div className="grow-wrap" data-value={value || placeholder}>
        <textarea
          ref={inputRef}
          value={value}
          rows={1}
          placeholder={placeholder}
          aria-label="Ask a question"
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
        />
      </div>
      <div className="ask-line" />
      <button
        className={`ask-hint ${value.trim() ? 'visible' : ''}`}
        onClick={onSend}
        aria-label="Send question"
        title="Send"
      >
        →
      </button>
    </div>
  );
}
