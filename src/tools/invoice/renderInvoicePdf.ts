import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, type PDFFont, rgb } from 'pdf-lib';
import { calculateInvoice, formatMoney } from './invoiceCalculations';
import { type InvoiceDraft, validateInvoice } from './invoiceModel';
import { wrapInvoiceText } from './invoicePdfLayout';

export interface InvoiceFonts {
  regular: Uint8Array;
  bold: Uint8Array;
}
async function loadFonts(): Promise<InvoiceFonts> {
  const load = async (name: string) => {
    const response = await fetch(`/fonts/invoice/NotoSans-${name}.ttf`);
    if (!response.ok)
      throw new Error('Unable to load invoice fonts. Please try again.');
    return new Uint8Array(await response.arrayBuffer());
  };
  const [regular, bold] = await Promise.all([load('Regular'), load('Bold')]);
  return { regular, bold };
}
export async function renderInvoicePdf(
  invoice: InvoiceDraft,
  fonts?: InvoiceFonts,
): Promise<Uint8Array> {
  if (Object.keys(validateInvoice(invoice)).length)
    throw new Error('Complete the invoice fields before downloading.');
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const source = fonts ?? (await loadFonts());
  const [regular, bold] = await Promise.all([
    document.embedFont(source.regular, { subset: true }),
    document.embedFont(source.bold, { subset: true }),
  ]);
  const supported = new Set(regular.getCharacterSet());
  const boldSupported = new Set(bold.getCharacterSet());
  const textContent = [
    invoice.invoiceNumber,
    ...Object.values(invoice.sender),
    ...Object.values(invoice.client),
    ...invoice.items.map((item) => item.description),
    invoice.notes,
  ].join('\n');
  const unsupported = Array.from(
    new Set(
      Array.from(textContent).filter(
        (character) =>
          !'\n\r\t'.includes(character) &&
          (!supported.has(character.codePointAt(0) ?? 0) ||
            !boldSupported.has(character.codePointAt(0) ?? 0)),
      ),
    ),
  );
  if (unsupported.length)
    throw new Error(
      `PDF contains unsupported characters: ${unsupported.slice(0, 8).join(' ')}. Replace these characters to download. Latin, Greek, and Cyrillic text are supported.`,
    );
  const totals = calculateInvoice(invoice);
  document.setTitle(`Invoice ${invoice.invoiceNumber}`);
  document.setCreator('Yehezgun Tools');
  const width = 595.28;
  const height = 841.89;
  const margin = 40;
  const ink = rgb(0.12, 0.15, 0.19);
  let page = document.addPage([width, height]);
  let y = height - margin;
  const draw = (
    text: string,
    x: number,
    size = 10,
    font: PDFFont = regular,
  ) => {
    page.drawText(text, { x, y: y - size, size, font, color: ink });
  };
  const newPage = () => {
    page = document.addPage([width, height]);
    y = height - margin;
  };
  const ensure = (space: number) => {
    if (y - space < margin + 22) newPage();
  };
  const block = (text: string, size = 10, font: PDFFont = regular) => {
    for (const line of wrapInvoiceText(
      text,
      (value) => font.widthOfTextAtSize(value, size),
      width - margin * 2,
    )) {
      ensure(size + 6);
      draw(line, margin, size, font);
      y -= size + 6;
    }
  };
  block('INVOICE', 26, bold);
  block(invoice.invoiceNumber, 14, bold);
  block(
    `Issued ${invoice.issueDate}${invoice.dueDate ? `   |   Due ${invoice.dueDate}` : ''}   |   ${invoice.currency}`,
  );
  y -= 18;
  for (const [label, party] of [
    ['FROM', invoice.sender],
    ['BILL TO', invoice.client],
  ] as const) {
    ensure(50);
    block(label, 9, bold);
    block(party.name, 12, bold);
    if (party.address) block(party.address);
    if (party.contact) block(party.contact);
    y -= 14;
  }
  const headers = () => {
    draw('DESCRIPTION', margin, 9, bold);
    draw('QTY', 310, 9, bold);
    draw('UNIT PRICE', 375, 9, bold);
    draw('AMOUNT', 490, 9, bold);
    y -= 24;
  };
  ensure(60);
  headers();
  for (const [index, item] of invoice.items.entries()) {
    const description = wrapInvoiceText(
      item.description,
      (value) => regular.widthOfTextAtSize(value, 10),
      250,
    );
    const quantity = wrapInvoiceText(
      item.quantity,
      (value) => regular.widthOfTextAtSize(value, 9),
      55,
    );
    const price = wrapInvoiceText(
      item.unitPrice,
      (value) => regular.widthOfTextAtSize(value, 9),
      85,
    );
    const amount = wrapInvoiceText(
      totals.lines[index] ?? '',
      (value) => regular.widthOfTextAtSize(value, 9),
      85,
    );
    for (
      let line = 0;
      line <
      Math.max(
        description.length,
        quantity.length,
        price.length,
        amount.length,
      );
      line += 1
    ) {
      if (y - 18 < margin + 22) {
        newPage();
        headers();
      }
      draw(description[line] ?? '', margin, 10);
      for (const [text, right] of [
        [quantity[line] ?? '', 365],
        [price[line] ?? '', 465],
        [amount[line] ?? '', width - margin],
      ] as const) {
        draw(text, right - regular.widthOfTextAtSize(text, 9), 9);
      }
      y -= 16;
    }
    y -= 12;
  }
  ensure(140);
  y -= 12;
  for (const [label, value] of [
    ['Subtotal', totals.subtotal],
    ['Discount', totals.discount],
    [`Tax (${invoice.taxPercent || '0'}%)`, totals.tax],
    ['Total due', totals.total],
  ]) {
    if (label === 'Total due') y -= 8;
    const font = label === 'Total due' ? bold : regular;
    draw(label ?? '', margin, 11, font);
    const amount = formatMoney(value ?? '0', invoice.currency);
    draw(amount, width - margin - font.widthOfTextAtSize(amount, 11), 11, font);
    y -= 23;
  }
  if (invoice.notes) {
    y -= 18;
    ensure(48);
    block('NOTES / PAYMENT INSTRUCTIONS', 9, bold);
    block(invoice.notes);
  }
  const pages = document.getPages();
  pages.forEach((current, index) => {
    current.drawText(`Page ${index + 1} of ${pages.length}`, {
      x: margin,
      y: 24,
      size: 8,
      font: regular,
      color: ink,
    });
  });
  return document.save();
}
