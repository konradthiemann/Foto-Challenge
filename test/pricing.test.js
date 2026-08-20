import test from 'node:test';
import assert from 'node:assert/strict';
import { priceCents, tierForGuests, formatEuro } from '../src/pricing.js';

test('priceCents: kostenlos bis 5 Gäste', () => {
  assert.equal(priceCents(1), 0);
  assert.equal(priceCents(5), 0);
});

test('priceCents: stufenweise Tiers', () => {
  assert.equal(priceCents(6), 990);
  assert.equal(priceCents(15), 990);
  assert.equal(priceCents(16), 1990);
  assert.equal(priceCents(30), 1990);
  assert.equal(priceCents(60), 3490);
  assert.equal(priceCents(200), 6990);
});

test('priceCents: oberhalb des höchsten Tiers auf letztes Tier geklemmt', () => {
  assert.equal(priceCents(999), 6990);
});

test('tierForGuests liefert das kleinste abdeckende Tier', () => {
  assert.equal(tierForGuests(10).upTo, 15);
  assert.equal(tierForGuests(50).upTo, 60);
});

test('formatEuro', () => {
  assert.equal(formatEuro(0), 'Kostenlos');
  assert.equal(formatEuro(990), '9,90 €');
  assert.equal(formatEuro(1990), '19,90 €');
});
