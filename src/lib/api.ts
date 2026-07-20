export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (typeof window !== 'undefined' && /minnebo\.ai$/i.test(window.location.host)
    ? 'https://minnebo-ai.vercel.app'
    : '');

const SHARE_BASE =
  (import.meta.env.VITE_SHARE_BASE as string | undefined) ??
  'https://minnebo-ai.vercel.app/api/redirect';

export type Tone = 'zen' | 'guide' | 'stoic' | 'sufi' | 'plain';
export type LengthPref = 'auto' | 'short' | 'long';

export const TONES: Tone[] = ['zen', 'guide', 'stoic', 'sufi', 'plain'];
export const LENGTHS: LengthPref[] = ['auto', 'short', 'long'];

export interface Challenge {
  challengeId: string;
  question: string;
}

export class ChallengeRequiredError extends Error {
  challenge: Challenge;
  constructor(challenge: Challenge) {
    super('Challenge required');
    this.challenge = challenge;
  }
}

export async function streamChat(opts: {
  message: string;
  tone: Tone;
  length: LengthPref;
  challenge?: { challengeId: string; challengeAnswer: string };
  onChunk: (fullText: string) => void;
}): Promise<string> {
  const body: Record<string, unknown> = { message: opts.message, tone: opts.tone };
  if (opts.length !== 'auto') body.length = opts.length;
  if (opts.challenge) {
    body.challengeId = opts.challenge.challengeId;
    body.challengeAnswer = opts.challenge.challengeAnswer;
  }

  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 429) {
      let data: { challenge?: Challenge } | null = null;
      try {
        data = await response.json();
      } catch {
        // non-JSON 429 falls through to the generic error
      }
      if (data?.challenge) throw new ChallengeRequiredError(data.challenge);
    }
    throw new Error('Connection error. Please try again.');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Connection error. Please try again.');

  const decoder = new TextDecoder();
  let full = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    full += decoder.decode(value, { stream: true });
    opts.onChunk(full);
  }
  return full;
}

export async function createShare(question: string, answer: string): Promise<{ id: string; url: string }> {
  const response = await fetch(`${API_BASE}/api/secure-store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to create share link');
  }
  const data = await response.json();
  if (!data.id) throw new Error('Failed to create share link');
  return { id: data.id, url: `${SHARE_BASE}?share=${data.id}` };
}

export function sendFeedback(id: string, vote: 'up' | 'down'): void {
  fetch(`${API_BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, vote }),
  }).catch(() => {
    // feedback is fire-and-forget
  });
}

export async function fetchShared(id: string): Promise<{ question: string; answer: string } | null> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) return null;
  const response = await fetch(`${API_BASE}/api/secure-store?id=${id}`);
  if (!response.ok) return null;
  const data = await response.json();
  if (data.question && data.answer) return { question: data.question, answer: data.answer };
  return null;
}
