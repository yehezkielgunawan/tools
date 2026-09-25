import { normalizeQrUrl } from './normalizeQrUrl';

export interface VCardContact {
  name: string;
  phone?: string;
  email?: string;
  organization?: string;
  title?: string;
  website?: string;
}

function escapeVCardText(value: string): string {
  return value
    .trim()
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

export function createVCard(contact: VCardContact): string {
  if (!contact.name.trim()) throw new Error('Name is required.');

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${escapeVCardText(contact.name)};;;;`,
    `FN:${escapeVCardText(contact.name)}`,
  ];

  const fields = [
    ['ORG', contact.organization],
    ['TITLE', contact.title],
    ['TEL', contact.phone],
    ['EMAIL', contact.email],
  ] as const;

  for (const [key, value] of fields) {
    if (value?.trim()) lines.push(`${key}:${escapeVCardText(value)}`);
  }

  if (contact.website?.trim()) {
    lines.push(`URL:${normalizeQrUrl(contact.website)}`);
  }

  lines.push('END:VCARD');
  return lines.join('\r\n');
}
