import { useEffect, useState } from 'react';
import { renderMarkdown } from '../lib/markdown.ts';

// Excludes * _ ` < > & so scrambled frames never trigger markdown/HTML.
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^()+-=[]{}|;:,.?/';

interface TextScrambleProps {
  children: string;
  duration?: number;
  speed?: number;
}

/**
 * Decodes text left-to-right: characters settle into place while the rest
 * flicker through random glyphs. Runs once when `children` changes. Honors
 * prefers-reduced-motion by showing the final text immediately.
 */
export function TextScramble({ children, duration = 1.2, speed = 0.03 }: TextScrambleProps) {
  const text = children;
  const [display, setDisplay] = useState(text);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(text);
      return;
    }
    const steps = Math.max(1, duration / speed);
    let step = 0;
    const interval = setInterval(() => {
      const progress = step / steps;
      let out = '';
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === ' ' || ch === '\n') {
          out += ch;
        } else if (progress * text.length > i) {
          out += ch;
        } else {
          out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }
      }
      setDisplay(out);
      step += 1;
      if (step > steps) {
        clearInterval(interval);
        setDisplay(text);
      }
    }, speed * 1000);
    return () => clearInterval(interval);
  }, [text, duration, speed]);

  return <span dangerouslySetInnerHTML={{ __html: renderMarkdown(display) }} />;
}
