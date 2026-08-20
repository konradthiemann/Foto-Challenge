import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';

// Uploads werden verkleinert und neu kodiert. Das schützt das Railway-Volume
// (Handyfotos sind schnell 5-12 MB) und entfernt dabei EXIF/GPS-Standortdaten
// aus den Bildern (Datenschutz). Fail-safe: schlägt sharp fehl (z. B. HEIC ohne
// libheic auf dem Host), wird das Original unverändert gespeichert — ein Upload
// darf während des Events niemals scheitern.

const MAX_DIM = 2048;
const JPEG_QUALITY = 80;
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
  'image/heif': '.heic',
};

/**
 * Verarbeitet einen Upload-Buffer und speichert ihn in `dir`.
 * @returns {Promise<{ filename: string, processed: boolean, bytes: number }>}
 */
export async function processAndStore(buffer, mimetype, dir) {
  const base = crypto.randomBytes(12).toString('hex');
  try {
    const out = await sharp(buffer)
      .rotate() // Auto-Orientierung aus EXIF anwenden; Re-Encode verwirft danach alle Metadaten
      .resize(MAX_DIM, MAX_DIM, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    const filename = `${base}.jpg`;
    await fs.promises.writeFile(path.join(dir, filename), out);
    return { filename, processed: true, bytes: out.length };
  } catch {
    // Fallback: Original speichern, damit der Upload nie fehlschlägt.
    const filename = `${base}${EXT_BY_MIME[mimetype] || '.jpg'}`;
    await fs.promises.writeFile(path.join(dir, filename), buffer);
    return { filename, processed: false, bytes: buffer.length };
  }
}
