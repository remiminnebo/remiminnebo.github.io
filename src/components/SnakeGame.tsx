import { useEffect, useState } from 'react';

const COLS = 30;
const ROWS = 20;
const TICK_MS = 150;

interface SnakeGameProps {
  onExit: () => void;
}

export function SnakeGame({ onExit }: SnakeGameProps) {
  const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
  const [food, setFood] = useState({ x: 15, y: 15 });
  const [direction, setDirection] = useState({ x: 0, y: 1 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() =>
    parseInt(localStorage.getItem('snakeHighScore') || '0', 10),
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp': setDirection({ x: 0, y: -1 }); break;
        case 'ArrowDown': setDirection({ x: 0, y: 1 }); break;
        case 'ArrowLeft': setDirection({ x: -1, y: 0 }); break;
        case 'ArrowRight': setDirection({ x: 1, y: 0 }); break;
        case 'Escape': onExit(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onExit]);

  useEffect(() => {
    const loop = setInterval(() => {
      setSnake((current) => {
        const head = { x: current[0].x + direction.x, y: current[0].y + direction.y };
        const hitWall = head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS;
        const hitSelf = current.some((seg) => seg.x === head.x && seg.y === head.y);
        if (hitWall || hitSelf) {
          onExit();
          return current;
        }
        const next = [head, ...current];
        if (head.x === food.x && head.y === food.y) {
          setScore((s) => {
            const ns = s + 1;
            if (ns > highScore) {
              setHighScore(ns);
              localStorage.setItem('snakeHighScore', String(ns));
            }
            return ns;
          });
          setFood({ x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) });
        } else {
          next.pop();
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(loop);
  }, [direction, food, highScore, onExit]);

  return (
    <div className="snake-page">
      <div className="snake-score">
        <span>score <b>{score}</b></span>
        <span>best <b>{highScore}</b></span>
      </div>
      <div
        className="snake-board"
        style={{
          gridTemplateColumns: `repeat(${COLS}, 18px)`,
          gridTemplateRows: `repeat(${ROWS}, 18px)`,
        }}
      >
        {Array.from({ length: COLS * ROWS }, (_, i) => {
          const x = i % COLS;
          const y = Math.floor(i / COLS);
          const isBody = snake.some((seg) => seg.x === x && seg.y === y);
          const isFood = food.x === x && food.y === y;
          return <div key={i} className={`snake-cell ${isBody ? 'body' : isFood ? 'food' : ''}`} />;
        })}
      </div>
      <div className="snake-hint">arrows to move · esc to leave</div>
    </div>
  );
}
