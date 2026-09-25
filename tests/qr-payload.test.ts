import { expect, test } from '@rstest/core';
import { createVCard } from '../src/tools/qr-code/createVCard';
import { normalizeQrUrl } from '../src/tools/qr-code/normalizeQrUrl';

test('adds HTTPS to a bare domain and preserves explicit HTTP links', () => {
  expect(normalizeQrUrl(' example.com/path?q=1 ')).toBe(
    'https://example.com/path?q=1',
  );
  expect(normalizeQrUrl('http://example.com')).toBe('http://example.com/');
});

test('rejects malformed URLs and non-web schemes', () => {
  expect(() => normalizeQrUrl('javascript:alert(1)')).toThrow(/valid http/i);
  expect(() => normalizeQrUrl('https://')).toThrow(/valid http/i);
  expect(() => normalizeQrUrl('example .com')).toThrow(/valid http/i);
});

test('creates a vCard 3.0 with the supported contact fields', () => {
  expect(
    createVCard({
      name: 'Ada Lovelace',
      phone: '+1 555 0100',
      email: 'ada@example.com',
      organization: 'Analytical Engine',
      title: 'Mathematician',
      website: 'example.com',
    }),
  ).toBe(
    'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Ada Lovelace;;;;\r\nFN:Ada Lovelace\r\nORG:Analytical Engine\r\nTITLE:Mathematician\r\nTEL:+1 555 0100\r\nEMAIL:ada@example.com\r\nURL:https://example.com/\r\nEND:VCARD',
  );
});

test('escapes vCard delimiters and line breaks without adding empty fields', () => {
  expect(createVCard({ name: 'Ada, A; \\Name\nEngineer' })).toBe(
    'BEGIN:VCARD\r\nVERSION:3.0\r\nN:Ada\\, A\\; \\\\Name\\nEngineer;;;;\r\nFN:Ada\\, A\\; \\\\Name\\nEngineer\r\nEND:VCARD',
  );
});

test('requires a contact name and validates an optional website', () => {
  expect(() => createVCard({ name: '  ' })).toThrow(/name is required/i);
  expect(() =>
    createVCard({ name: 'Ada', website: 'ftp://example.com' }),
  ).toThrow(/valid http/i);
});
