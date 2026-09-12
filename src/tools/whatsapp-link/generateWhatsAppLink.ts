export function generateWhatsAppLink(
  normalizedPhone: string,
  message: string,
): string {
  const baseUrl = `https://wa.me/${normalizedPhone}`;
  const trimmedMessage = message.trim();

  return trimmedMessage
    ? `${baseUrl}?text=${encodeURIComponent(trimmedMessage)}`
    : baseUrl;
}
