import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { annotateWithTask, wrapText } from '../src/imageAnnotate.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'knips-annotate-'));

async function makeTestImage(width, height) {
  const filePath = path.join(tmp, `${width}x${height}-${Date.now()}-${Math.random()}.jpg`);
  const buf = await sharp({
    create: { width, height, channels: 3, background: { r: 100, g: 140, b: 180 } },
  }).jpeg().toBuffer();
  fs.writeFileSync(filePath, buf);
  return filePath;
}

test('annotateWithTask gibt ein valides JPEG mit unveränderten Maßen zurück', async () => {
  const file = await makeTestImage(800, 600);
  const out = await annotateWithTask(file, 'Finde jemanden, den du noch nicht kennst.');
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.equal(meta.width, 800);
  assert.equal(meta.height, 600);
});

test('annotateWithTask bricht langen Text um und kappt nach 3 Zeilen', async () => {
  const file = await makeTestImage(600, 400);
  const longText = 'Finde jemanden, der genauso große Schuhe trägt wie du und macht ein wirklich '
    + 'ausführliches Gruppenfoto mit ganz vielen Leuten, die alle gleichzeitig lachen müssen.';
  const out = await annotateWithTask(file, longText);
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.equal(meta.width, 600);
  assert.equal(meta.height, 400);
});

test('annotateWithTask escaped XML-Sonderzeichen im Task-Text', async () => {
  const file = await makeTestImage(500, 400);
  const out = await annotateWithTask(file, 'Tanzt & singt "laut" <verrückt> los!');
  const meta = await sharp(out).metadata();
  assert.equal(meta.format, 'jpeg');
  assert.equal(meta.width, 500);
  assert.equal(meta.height, 400);
});

test('wrapText bricht an Wortgrenzen um und begrenzt auf 3 Zeilen', () => {
  const lines = wrapText('Eins zwei drei vier fünf sechs sieben acht neun zehn elf zwölf', 12);
  assert.ok(lines.length <= 3);
  for (const line of lines) {
    assert.ok(line.length <= 12 || line.endsWith('…'), `Zeile "${line}" zu lang`);
  }
});

test('wrapText kappt mit „…" wenn der Text auch nach 3 Zeilen nicht passt', () => {
  const longText = 'wortwortwort '.repeat(30).trim();
  const lines = wrapText(longText, 15);
  assert.equal(lines.length, 3);
  assert.ok(lines[2].endsWith('…'));
});
