// Shared Open Graph card renderer — matches the live minnebo.ai design:
// warm paper, a luminous violet planet, and the bold-italic serif wordmark
// in a white poster chip with the teal .AI block.
//
// All text is rasterized to vector <path> outlines with opentype.js so the
// card renders identically everywhere, including serverless environments
// (Vercel) that ship no system fonts for librsvg/sharp to fall back on.

import fs from 'fs';
import path from 'path';
import opentype from 'opentype.js';

const FONT_DIR = path.join(process.cwd(), 'api', '_fonts');

function loadFont(file) {
  const buf = fs.readFileSync(path.join(FONT_DIR, file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

// Loaded once per warm lambda.
const FONTS = {
  serif: loadFont('serif-italic.woff'),
  sans: loadFont('sans-regular.woff'),
  sansBold: loadFont('sans-bold.woff'),
};

/** Measure a string's advance width at a given size (with optional tracking). */
function measure(font, text, size, tracking = 0) {
  const scale = size / font.unitsPerEm;
  let w = 0;
  let prev = null;
  for (const ch of text) {
    const g = font.charToGlyph(ch);
    if (prev) w += font.getKerningValue(prev, g) * scale + tracking * size;
    w += g.advanceWidth * scale;
    prev = g;
  }
  return w;
}

/**
 * Render text as vector paths. One <path> per glyph (via charToGlyph) — this
 * bypasses opentype.js's feature engine, which throws on some ccmp lookups in
 * these fonts, and keeps adjacent glyph counters from being cross-filled.
 * `tracking` (fraction of em) adds letter spacing; the slanted display serif
 * needs a touch of it so italic bowls (b+o) don't collide at large sizes.
 * anchor: 'start' | 'middle' | 'end'
 */
function text(font, str, x, y, size, { fill = '#17161a', anchor = 'start', tracking = 0 } = {}) {
  const scale = size / font.unitsPerEm;
  let cx = x;
  if (anchor !== 'start') {
    const w = measure(font, str, size, tracking);
    cx = anchor === 'middle' ? x - w / 2 : x - w;
  }
  const parts = [];
  let prev = null;
  for (const ch of str) {
    const g = font.charToGlyph(ch);
    if (prev) cx += font.getKerningValue(prev, g) * scale + tracking * size;
    const d = g.getPath(cx, y, size).toPathData(2);
    if (d) parts.push(`<path d="${d}"/>`);
    cx += g.advanceWidth * scale;
    prev = g;
  }
  return `<g fill="${fill}" fill-rule="nonzero">${parts.join('')}</g>`;
}

function wrapToLines(str, font, size, maxWidth, maxLines, tracking = 0) {
  const words = String(str).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const trial = line ? line + ' ' + word : word;
    if (measure(font, trial, size, tracking) > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length >= maxLines) break;
    } else {
      line = trial;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length >= maxLines) {
    let last = lines[maxLines - 1].replace(/[.,;:\s]*$/, '');
    while (last && measure(font, last + '…', size, tracking) > maxWidth) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

// Slight tracking keeps the slanted display serif's bowls from colliding
// and its counters (e, o) from filling at librsvg's scanline precision.
const SERIF_TRACK = 0.06;

// Luminous planet art on a 200x200 canvas, scaled/positioned by the caller.
function planet(cx, cy, r) {
  const s = r / 100;
  return `
  <g transform="translate(${cx - r}, ${cy - r}) scale(${s})">
    <circle cx="100" cy="100" r="94" fill="url(#ogBody)"/>
    <g clip-path="url(#ogDisk)">
      <path d="M6 128 Q40 96 78 132 T176 138" fill="none" stroke="#ff5a1e" stroke-width="6" stroke-linecap="round"/>
      <path d="M30 170 Q78 138 116 172" fill="none" stroke="#ff8a2a" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M118 26 Q150 58 138 96" fill="none" stroke="#ff5a1e" stroke-width="4" stroke-linecap="round" opacity="0.85"/>
      <ellipse cx="82" cy="132" rx="46" ry="20" fill="url(#ogGlow)"/>
      <path d="M128 40 Q182 52 186 110 Q156 142 126 104 Q116 66 128 40Z" fill="#c9c2dd" opacity="0.5"/>
      <ellipse cx="64" cy="58" rx="26" ry="16" fill="#ffffff" opacity="0.12"/>
    </g>
    <circle cx="100" cy="100" r="94" fill="none" stroke="#1a0a2e" stroke-width="4"/>
  </g>`;
}

/**
 * @param {{question?: string, answer?: string, accent?: string}} opts
 * @returns {string} 1200x630 SVG markup
 */
export function buildOgSvg({ question = '', answer = '', accent = '#12d7c6' } = {}) {
  const hasQ = Boolean(question);
  const defs = `
  <defs>
    <radialGradient id="ogBody" cx="38%" cy="34%" r="80%">
      <stop offset="0%" stop-color="#d7c3ea"/>
      <stop offset="32%" stop-color="#8a3fb0"/>
      <stop offset="68%" stop-color="#5a1a86"/>
      <stop offset="100%" stop-color="#2a0b46"/>
    </radialGradient>
    <radialGradient id="ogGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ff8a2a" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#ff8a2a" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="ogDisk"><circle cx="100" cy="100" r="94"/></clipPath>
    <radialGradient id="ogHalo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2a0b46" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#2a0b46" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

  // wordmark chip — italic serif Minnebo + accent .AI block
  const chip = (x, y, scale) => {
    const w = 456 * scale, h = 96 * scale;
    const aiX = 312 * scale, aiW = 102 * scale;
    return `
    <g transform="translate(${x}, ${y})">
      <rect x="8" y="10" width="${w}" height="${h}" fill="#17161a"/>
      <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff" stroke="#17161a" stroke-width="${4 * scale}"/>
      ${text(FONTS.serif, 'Minnebo', 30 * scale, 68 * scale, 56 * scale, { tracking: SERIF_TRACK })}
      <rect x="${aiX}" y="${26 * scale}" width="${aiW}" height="${46 * scale}" fill="${accent}"/>
      ${text(FONTS.sansBold, '.AI', aiX + aiW / 2, 59 * scale, 30 * scale, { fill: '#000000', anchor: 'middle' })}
    </g>`;
  };

  if (!hasQ) {
    // Default card: centered planet with the poster title on it.
    const tagW = 300;
    return `
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      ${defs}
      <rect width="1200" height="630" fill="#f4f2ec"/>
      <ellipse cx="600" cy="300" rx="360" ry="330" fill="url(#ogHalo)"/>
      ${planet(600, 285, 210)}
      ${chip(372, 250, 1.0)}
      <g transform="translate(${600 - tagW / 2}, 372)">
        <rect x="6" y="7" width="${tagW}" height="46" fill="#17161a"/>
        <rect x="0" y="0" width="${tagW}" height="46" fill="#ffffff" stroke="#17161a" stroke-width="3"/>
        ${text(FONTS.serif, 'ask, and the flow answers', tagW / 2, 31, 22, { anchor: 'middle', tracking: SERIF_TRACK })}
      </g>
    </svg>`;
  }

  // Shared-conversation card: planet medallion + wordmark header, then the
  // question in serif and the answer in clean sans.
  const qLines = wrapToLines(question, FONTS.serif, 42, 880, 2, SERIF_TRACK);
  const aLines = wrapToLines(answer, FONTS.sans, 26, 900, 4);
  const qMarkup = qLines
    .map((l, i) => text(FONTS.serif, l, 116, 266 + i * 52, 42, { tracking: SERIF_TRACK }))
    .join('');
  const aStartY = 266 + qLines.length * 52 + 34;
  const aMarkup = aLines
    .map((l, i) => text(FONTS.sans, l, 96, aStartY + i * 40, 26, { fill: '#4a4852' }))
    .join('');

  return `
  <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    ${defs}
    <rect width="1200" height="630" fill="#f4f2ec"/>
    ${planet(1040, 150, 108)}
    ${chip(96, 78, 0.62)}
    <line x1="96" y1="196" x2="1104" y2="196" stroke="#17161a" stroke-opacity="0.14" stroke-width="2"/>
    <rect x="96" y="230" width="6" height="${qLines.length * 52 - 8}" fill="${accent}"/>
    ${qMarkup}
    ${aMarkup}
    ${text(FONTS.sansBold, 'minnebo.ai', 96, 590, 20)}
  </svg>`;
}
