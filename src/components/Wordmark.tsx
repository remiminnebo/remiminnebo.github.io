import { useEffect, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz*&%#@!?';
const NAME = 'Minnebo';

/**
 * Typographic wordmark with a one-time scramble-in — a quiet nod to the
 * old site's glitch identity.
 */
export function Wordmark() {
  const [display, setDisplay] = useState(NAME);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let step = 0;
    const steps = 24;
    const interval = setInterval(() => {
      const progress = step / steps;
      setDisplay(
        NAME.split('')
          .map((ch, i) =>
            progress * NAME.length > i ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          )
          .join(''),
      );
      step += 1;
      if (step > steps) {
        clearInterval(interval);
        setDisplay(NAME);
      }
    }, 45);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="hero-type">
      <h1 className="wordmark">
        {display}
        <span className="tld">.ai</span>
      </h1>
      <p className="tagline">ask, and the flow answers</p>
    </header>
  );
}
