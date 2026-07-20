import { useEffect, useRef, useState } from 'react';
import type { HistoryItem } from '../hooks/useHistory.ts';
import { IconCopy, IconPin, IconTrash } from './icons.tsx';

interface HistoryPanelProps {
  items: HistoryItem[];
  sorted: (query: string) => HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onTogglePin: (id: string) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onCopy: (item: HistoryItem) => void;
  onClose: () => void;
}

export function HistoryPanel({
  items,
  sorted,
  onSelect,
  onTogglePin,
  onRemove,
  onClear,
  onCopy,
  onClose,
}: HistoryPanelProps) {
  const [query, setQuery] = useState('');
  const [focusIdx, setFocusIdx] = useState(0);
  const [closing, setClosing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const filtered = sorted(query);

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 220);
  };

  useEffect(() => {
    listRef.current?.focus();
    setFocusIdx(0);
  }, [query]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (!filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[focusIdx];
      if (item) {
        onSelect(item);
        close();
      }
    }
  };

  return (
    <>
      <div className={`panel-scrim ${closing ? 'closing' : ''}`} onClick={close} />
      <div className={`history-panel ${closing ? 'closing' : ''}`} role="dialog" aria-label="History">
        <div className="history-head">
          <h2>
            History<span className="count">{items.length}</span>
          </h2>
          {items.length > 0 && (
            <button className="history-clear" onClick={onClear}>
              Clear all
            </button>
          )}
        </div>
        <input
          className="history-search"
          placeholder="Search the past…"
          aria-label="Search history"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
        />
        <div className="history-list" ref={listRef} tabIndex={0} onKeyDown={handleKey} role="listbox">
          {filtered.length === 0 && <div className="history-empty">Nothing here yet. Ask something.</div>}
          {filtered.map((item, idx) => (
            <div
              key={item.id}
              role="option"
              aria-selected={focusIdx === idx}
              className={`history-item ${focusIdx === idx ? 'focused' : ''}`}
              onClick={() => {
                onSelect(item);
                close();
              }}
            >
              <div className="hq">
                {item.pinned && (
                  <span style={{ color: 'var(--accent)', marginRight: 6, verticalAlign: 'middle' }}>
                    <IconPin size={12} />
                  </span>
                )}
                {item.question}
              </div>
              <div className="ha">{item.answer}</div>
              <div className="ht">{new Date(item.ts).toLocaleString()}</div>
              <div className="h-actions" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => onCopy(item)} title="Copy" aria-label="Copy conversation">
                  <IconCopy size={15} />
                </button>
                <button
                  onClick={() => onTogglePin(item.id)}
                  className={item.pinned ? 'pinned' : ''}
                  title={item.pinned ? 'Unpin' : 'Pin'}
                  aria-pressed={!!item.pinned}
                  aria-label={item.pinned ? 'Unpin' : 'Pin'}
                >
                  <IconPin />
                </button>
                <button onClick={() => onRemove(item.id)} className="danger" title="Delete" aria-label="Delete">
                  <IconTrash />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
