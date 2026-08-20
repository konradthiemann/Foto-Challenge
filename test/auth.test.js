import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword, verifyPassword, signToken, verifyToken, randomId,
} from '../src/auth.js';

test('Passwort-Hash Roundtrip', () => {
  const stored = hashPassword('geheim123');
  assert.ok(stored.startsWith('scrypt$'));
  assert.equal(verifyPassword('geheim123', stored), true);
  assert.equal(verifyPassword('falsch', stored), false);
});

test('verifyPassword verträgt leere/kaputte Eingaben', () => {
  assert.equal(verifyPassword('x', ''), false);
  assert.equal(verifyPassword('x', 'nonsense'), false);
  assert.equal(verifyPassword('x', null), false);
});

test('Token signieren + verifizieren Roundtrip', () => {
  const token = signToken({ eventId: 'party', guestId: 'g1' });
  assert.deepEqual(verifyToken(token), { eventId: 'party', guestId: 'g1' });
});

test('verifyToken lehnt manipulierte/ungültige Tokens ab', () => {
  const token = signToken({ admin: true });
  assert.equal(verifyToken(token + 'x'), null);
  assert.equal(verifyToken('garbage'), null);
  assert.equal(verifyToken(null), null);
  const [body] = token.split('.');
  assert.equal(verifyToken(`${body}.wrongsig`), null);
});

test('randomId liefert Hex in der angeforderten Byte-Länge', () => {
  assert.match(randomId(8), /^[0-9a-f]{16}$/);
  assert.notEqual(randomId(8), randomId(8));
});
