import { API_BASE } from './api.ts';

export function updateMetaTags(question: string, answer: string, shareId?: string | null): void {
  const clean = (text: string) => text.replace(/[<>&"']/g, '').trim();
  const safeQuestion = clean(question);
  const safeAnswer = clean(answer);

  document.title = `${safeQuestion} - minnebo.ai`;

  const setMeta = (property: string, content: string) => {
    let meta = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('property', property);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  };

  // PNG endpoint — WhatsApp/iMessage/most scrapers don't render SVG og:image.
  const imageUrl = shareId
    ? `${API_BASE || 'https://minnebo-ai.vercel.app'}/api/og-image-png?id=${encodeURIComponent(shareId)}`
    : 'https://minnebo-ai.vercel.app/api/og-image-png';

  setMeta('og:title', safeQuestion);
  setMeta('og:description', safeAnswer.substring(0, 200) + (safeAnswer.length > 200 ? '...' : ''));
  setMeta('og:url', window.location.href);
  setMeta('og:type', 'article');
  setMeta('og:site_name', 'minnebo.ai');
  setMeta('og:image', imageUrl);
  setMeta('og:image:width', '1200');
  setMeta('og:image:height', '630');
}
