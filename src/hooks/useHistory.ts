import { useState } from 'react';

export interface HistoryItem {
  id: string;
  question: string;
  answer: string;
  pinned?: boolean;
  ts: number;
}

const STORAGE_KEY = 'minnebo_history';
const MAX_ITEMS = 50;

function load(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useHistory() {
  const [items, setItems] = useState<HistoryItem[]>(load);

  const persist = (next: HistoryItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, MAX_ITEMS)));
    } catch {
      // storage full or unavailable; in-memory list still works
    }
  };

  const add = (question: string, answer: string) => {
    const item: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      question,
      answer,
      ts: Date.now(),
    };
    persist([item, ...items]);
  };

  const togglePin = (id: string) =>
    persist(items.map((h) => (h.id === id ? { ...h, pinned: !h.pinned } : h)));

  const remove = (id: string) => persist(items.filter((h) => h.id !== id));

  const clear = () => persist([]);

  /** Pinned first, then newest first, optionally filtered. */
  const sorted = (query = '') => {
    const q = query.trim().toLowerCase();
    return items
      .slice()
      .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.ts - a.ts)
      .filter(
        (item) =>
          !q ||
          item.question.toLowerCase().includes(q) ||
          item.answer.toLowerCase().includes(q),
      );
  };

  return { items, add, togglePin, remove, clear, sorted };
}
