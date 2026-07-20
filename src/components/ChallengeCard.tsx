import type { Challenge } from '../lib/api.ts';

interface ChallengeCardProps {
  challenge: Challenge;
  answer: string;
  onAnswer: (value: string) => void;
  onSubmit: () => void;
}

export function ChallengeCard({ challenge, answer, onAnswer, onSubmit }: ChallengeCardProps) {
  return (
    <div className="challenge-card">
      <p className="c-title">A toll at the gate.</p>
      <p className="c-q">Solve to continue: {challenge.question} = ?</p>
      <div className="c-row">
        <input
          type="number"
          value={answer}
          placeholder="…"
          aria-label="Challenge answer"
          onChange={(e) => onAnswer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && answer) onSubmit();
          }}
        />
        <button className="share-copy" onClick={onSubmit} disabled={!answer}>
          Pass
        </button>
      </div>
    </div>
  );
}
