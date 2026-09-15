import test from 'node:test';
import assert from 'node:assert/strict';
import { rentPerHourOf, totalOf, money } from '../src/lib/pricing.ts';
import { normalizePhone, normalizeMessenger } from '../src/lib/contact-input.ts';

test('rental tariffs: normal week, December boundary and weekend', () => {
  for (const [date, expected] of [['2026-09-15',2900],['2026-09-18',4500],['2026-09-19',6000],['2026-09-20',4500],['2026-12-11',5850],['2026-12-12',9000],['2026-12-13',6750],['2026-12-14',4350]]) {
    assert.equal(rentPerHourOf(new Date(date + 'T12:00:00')), expected, date);
  }
  assert.equal(totalOf('extra',5,new Date(2026,8,15)),47000);
  assert.equal(totalOf('happy',4,null),19700);
  assert.match(money(19700),/19\s700\s₽/);
});
test('phone preserves landlines, mobile and international contacts', () => {
  assert.equal(normalizePhone('+7 (812) 345-67-89'),'+78123456789');
  assert.equal(normalizePhone('8 (912) 345-67-89'),'+79123456789');
  assert.equal(normalizePhone('9123456789'),'+79123456789');
  assert.equal(normalizePhone('+34 612 345 678'),'+34612345678');
  assert.equal(normalizePhone('123'),null);
  assert.equal(normalizePhone('phone 9123456789'),null);
});
test('messenger links are never rewritten to an unrelated username', () => {
  assert.equal(normalizeMessenger('https://t.me/test_user'),'https://t.me/test_user');
  assert.equal(normalizeMessenger('t.me/test_user'),'https://t.me/test_user');
  assert.equal(normalizeMessenger('@test_user'),'@test_user');
  assert.equal(normalizeMessenger('https://max.ru/u/test-user'),'https://max.ru/u/test-user');
  assert.equal(normalizeMessenger('https://evil.example/test_user'),null);
  assert.equal(normalizeMessenger('https://t.me@evil.example/test_user'),null);
  assert.equal(normalizeMessenger(''), '');
});
