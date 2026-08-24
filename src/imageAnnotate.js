import sharp from 'sharp';

// Brennt den Aufgaben-Text unten ins Foto ein (für den "mit-aufgabe"-Ordner im
// Galerie-Export). Statt die Bildhelligkeit zu analysieren, legen wir einen
// Verlaufs-Scrim (transparent -> schwarz) über den unteren Bildbereich — das
// garantiert Lesbarkeit unabhängig vom Motiv, ohne Sonderfälle. Zusätzlich
// bekommt der Text einen dünnen schwarzen Stroke für Kontrast am Scrim-Rand.

const SCRIM_HEIGHT_RATIO = 0.22;
const MAX_LINES = 3;
const JPEG_QUALITY = 80;

const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

function escapeXml(str) {
  return String(str).replace(/[&<>"]/g, (c) => XML_ESCAPES[c]);
}

/**
 * Bricht `text` manuell in Zeilen von höchstens `maxCharsPerLine` Zeichen um.
 * Bricht bevorzugt an Wortgrenzen. Gibt maximal `MAX_LINES` Zeilen zurück;
 * passt der Text auch dann nicht, wird die letzte Zeile mit „…" gekappt.
 */
export function wrapText(text, maxCharsPerLine) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
    if (lines.length >= MAX_LINES) break;
  }
  if (current && lines.length < MAX_LINES) lines.push(current);

  if (lines.length > MAX_LINES) {
    lines.length = MAX_LINES;
  }

  // Falls noch Wörter übrig sind, die letzte Zeile mit "…" kappen.
  const consumed = lines.join(' ').split(/\s+/).length;
  if (lines.length === MAX_LINES && consumed < words.length) {
    let last = lines[MAX_LINES - 1];
    while (last.length > 0 && `${last}…`.length > maxCharsPerLine) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[MAX_LINES - 1] = `${last}…`;
  }

  return lines;
}

/**
 * Legt den Aufgaben-Text als lesbaren Overlay-Text unten auf das Foto und
 * gibt das Ergebnis als JPEG-Buffer zurück. Wirft bei Fehlern (z. B. kaputte
 * Bilddatei) — die Fehlerbehandlung entscheidet der Aufrufer.
 * @param {string} diskPath - Pfad zum Originalfoto auf Disk.
 * @param {string} taskText - Aufgaben-Text, der eingeblendet wird.
 * @returns {Promise<Buffer>}
 */
export async function annotateWithTask(diskPath, taskText) {
  const image = sharp(diskPath);
  const { width, height } = await image.metadata();

  const fontSize = Math.max(14, Math.round(width / 22));
  const strokeWidth = Math.max(1, fontSize / 8);
  const maxCharsPerLine = Math.max(8, Math.round((width * 0.9) / (fontSize * 0.55)));
  const lines = wrapText(taskText, maxCharsPerLine);

  const scrimHeight = Math.round(height * SCRIM_HEIGHT_RATIO);
  const lineHeight = fontSize * 1.2;
  const textBlockHeight = lines.length * lineHeight;
  const firstLineY = height - scrimHeight + (scrimHeight - textBlockHeight) / 2 + fontSize;

  // dy is relative to the *previous* tspan's baseline, so it stacks lines
  // correctly as long as only the first tspan carries an absolute y (set on
  // the parent <text> below) and every following tspan just adds `lineHeight`.
  const tspans = lines
    .map((line, i) => `<tspan x="${width / 2}"${i === 0 ? '' : ` dy="${lineHeight}"`}>${escapeXml(line)}</tspan>`)
    .join('');

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="black" stop-opacity="0" />
          <stop offset="100%" stop-color="black" stop-opacity="0.75" />
        </linearGradient>
      </defs>
      <rect x="0" y="${height - scrimHeight}" width="${width}" height="${scrimHeight}" fill="url(#scrim)" />
      <text
        x="${width / 2}"
        y="${firstLineY}"
        font-family="Inter, Arial, sans-serif"
        font-size="${fontSize}"
        font-weight="600"
        fill="white"
        stroke="black"
        stroke-width="${strokeWidth}"
        paint-order="stroke"
        text-anchor="middle"
      >${tspans}</text>
    </svg>
  `;

  return sharp(diskPath)
    .composite([{ input: Buffer.from(svg), gravity: 'south' }])
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();
}
