import { expect, test } from '@rstest/core';
import { generateWhatsAppLink } from './generateWhatsAppLink';
import { normalizePhoneNumber } from './normalizePhoneNumber';

test.each([
  ['08123456789', '628123456789'],
  ['+628123456789', '628123456789'],
  ['628123456789', '628123456789'],
  ['0812-3456-789', '628123456789'],
  ['+62 (812) 3456-789', '628123456789'],
])('normalizes %s to %s', (input, expected) => {
  expect(normalizePhoneNumber(input)).toEqual({ ok: true, value: expected });
});

test.each([
  ['', 'Phone number is required.'],
  [
    '08123abc789',
    'Use only numbers, a leading +, spaces, hyphens, or parentheses.',
  ],
  ['628123', 'Enter a valid Indonesian mobile number.'],
  [
    '+628123456789+',
    'Use only numbers, a leading +, spaces, hyphens, or parentheses.',
  ],
  ['658123456789', 'Use an Indonesian mobile number beginning with 08 or 628.'],
])('rejects %s with %s', (input, error) => {
  expect(normalizePhoneNumber(input)).toEqual({ ok: false, error });
});

test('generates a link without a message', () => {
  expect(generateWhatsAppLink('628123456789', '')).toBe(
    'https://wa.me/628123456789',
  );
});

test('encodes a message in the generated link', () => {
  expect(generateWhatsAppLink('628123456789', 'Hello there & 👋')).toBe(
    'https://wa.me/628123456789?text=Hello%20there%20%26%20%F0%9F%91%8B',
  );
});
