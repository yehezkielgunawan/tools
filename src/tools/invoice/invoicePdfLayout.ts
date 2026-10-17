export function wrapInvoiceText(
  text: string,
  width: (text: string) => number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!paragraph) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const character of paragraph.replace(/\t/g, '    ')) {
      if (line && width(line + character) > maxWidth) {
        const boundary = line.lastIndexOf(' ');
        if (boundary > 0 && character !== ' ') {
          lines.push(line.slice(0, boundary));
          line = line.slice(boundary + 1);
        } else {
          lines.push(line);
          line = '';
        }
      }
      line += character;
    }
    if (line) lines.push(line);
  }
  return lines;
}
