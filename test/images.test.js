import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { processAndStore } from '../src/images.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'knips-img-'));

test('processAndStore verkleinert große Bilder und gibt JPEG aus', async () => {
  const big = await sharp({
    create: { width: 4000, height: 3000, channels: 3, background: { r: 120, g: 160, b: 200 } },
  }).jpeg().toBuffer();

  const { filename, processed } = await processAndStore(big, 'image/jpeg', tmp);
  assert.equal(processed, true);
  assert.ok(filename.endsWith('.jpg'));

  const outBuf = fs.readFileSync(path.join(tmp, filename));
  const meta = await sharp(outBuf).metadata();
  assert.ok(meta.width <= 2048 && meta.height <= 2048, 'auf max. 2048px verkleinert');
  assert.equal(meta.format, 'jpeg');
  assert.ok(outBuf.length < big.length, 'Ausgabe kleiner als Eingabe');
});

test('processAndStore entfernt EXIF-Metadaten', async () => {
  const withExif = await sharp({
    create: { width: 200, height: 200, channels: 3, background: { r: 10, g: 10, b: 10 } },
  }).withExif({ IFD0: { Copyright: 'KnipsTest' } }).jpeg().toBuffer();

  const { filename } = await processAndStore(withExif, 'image/jpeg', tmp);
  const meta = await sharp(fs.readFileSync(path.join(tmp, filename))).metadata();
  assert.ok(!meta.exif, 'EXIF/GPS wurde entfernt');
});

test('processAndStore speichert bei Fehler das Original (fail-safe)', async () => {
  const garbage = Buffer.from('das ist kein bild');
  const { filename, processed } = await processAndStore(garbage, 'image/heic', tmp);
  assert.equal(processed, false);
  assert.ok(filename.endsWith('.heic'));
  assert.deepEqual(fs.readFileSync(path.join(tmp, filename)), garbage);
});
