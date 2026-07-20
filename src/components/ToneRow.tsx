import { LENGTHS, TONES, type LengthPref, type Tone } from '../lib/api.ts';

interface ToneRowProps {
  tone: Tone;
  length: LengthPref;
  onTone: (tone: Tone) => void;
  onLength: (length: LengthPref) => void;
}

export function ToneRow({ tone, length, onTone, onLength }: ToneRowProps) {
  return (
    <div className="tones">
      <div role="group" aria-label="Tone" style={{ display: 'flex', gap: 14 }}>
        {TONES.map((t) => (
          <button
            key={t}
            className={`tone-btn ${tone === t ? 'active' : ''}`}
            aria-pressed={tone === t}
            onClick={() => onTone(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <span className="tone-sep">—</span>
      <div role="group" aria-label="Length" style={{ display: 'flex', gap: 14 }}>
        {LENGTHS.map((l) => (
          <button
            key={l}
            className={`tone-btn ${length === l ? 'active' : ''}`}
            aria-pressed={length === l}
            onClick={() => onLength(l)}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
