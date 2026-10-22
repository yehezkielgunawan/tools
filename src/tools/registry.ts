export type ToolCategory = 'generator' | 'developer' | 'image' | 'pdf';
export type ToolIconName =
  | 'message-circle'
  | 'qr-code'
  | 'gift'
  | 'braces'
  | 'key-round'
  | 'image'
  | 'stamp'
  | 'file-text';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  path: string;
  category: ToolCategory;
  keywords: readonly string[];
  icon: ToolIconName;
}

export const toolCategories = [
  { id: 'generator', label: 'Generator' },
  { id: 'developer', label: 'Developer' },
  { id: 'image', label: 'Image' },
  { id: 'pdf', label: 'PDF' },
] as const satisfies readonly {
  id: ToolCategory;
  label: string;
}[];

export const tools = [
  {
    id: 'invoice',
    name: 'Invoice Generator',
    description:
      'Create invoices locally, download PDFs, and share read-only invoice links.',
    path: '/generator/invoice',
    category: 'generator',
    keywords: ['invoice', 'billing', 'payment', 'tax', 'pdf', 'receipt'],
    icon: 'file-text',
  },
  {
    id: 'whatsapp-link',
    name: 'WhatsApp Link Generator',
    description: 'Create a ready-to-share wa.me link with an optional message.',
    path: '/generator/whatsapp-link',
    category: 'generator',
    keywords: ['whatsapp', 'wa', 'message', 'link'],
    icon: 'message-circle',
  },
  {
    id: 'qr-code',
    name: 'QR Code Generator',
    description: 'Create a scannable QR code for a URL or contact card.',
    path: '/generator/qr-code',
    category: 'generator',
    keywords: ['qr', 'qrcode', 'url', 'vcard', 'contact'],
    icon: 'qr-code',
  },
  {
    id: 'greeting-card',
    name: 'Greeting Card Generator',
    description:
      'Make personalized cards for birthdays, congratulations, appreciation, and everyday greetings.',
    path: '/generator/greeting-card',
    category: 'generator',
    keywords: [
      'greeting',
      'card',
      'birthday',
      'congratulations',
      'appreciation',
      'thank you',
      'celebration',
      'png',
    ],
    icon: 'gift',
  },
  {
    id: 'json-formatter',
    name: 'JSON Formatter & Viewer',
    description:
      'Format, validate, minify, and explore JSON as a tree directly in your browser.',
    path: '/developer/json-formatter',
    category: 'developer',
    keywords: [
      'json',
      'formatter',
      'validator',
      'developer',
      'viewer',
      'tree',
      'nested',
    ],
    icon: 'braces',
  },
  {
    id: 'json-yaml',
    name: 'JSON ↔ YAML',
    description:
      'Convert JSON to YAML or YAML to JSON locally in your browser.',
    path: '/developer/json-yaml',
    category: 'developer',
    keywords: [
      'json',
      'yaml',
      'yml',
      'converter',
      'configuration',
      'serialize',
    ],
    icon: 'braces',
  },
  {
    id: 'url-encoder-decoder',
    name: 'URL Encoder & Decoder',
    description:
      'Encode and decode URL components or whole URLs locally in your browser.',
    path: '/developer/url-encoder-decoder',
    category: 'developer',
    keywords: [
      'url',
      'uri',
      'encode',
      'decode',
      'encoder',
      'decoder',
      'percent',
      'query',
      'component',
    ],
    icon: 'braces',
  },
  {
    id: 'key-pair-generator',
    name: 'Key Pair Generator',
    description:
      'Generate RSA and elliptic-curve public/private keys as PEM files locally in your browser.',
    path: '/developer/key-pair-generator',
    category: 'developer',
    keywords: [
      'rsa',
      'ec',
      'ecdsa',
      'pem',
      'public key',
      'private key',
      'key pair',
      'pkcs8',
      'spki',
    ],
    icon: 'key-round',
  },
  {
    id: 'image-compressor',
    name: 'Image Compressor',
    description:
      'Compress JPEG and PNG images in your browser with Canvas or pixo-wasm.',
    path: '/image/image-compressor',
    category: 'image',
    keywords: ['image', 'compressor', 'jpeg', 'png', 'wasm', 'canvas'],
    icon: 'image',
  },
  {
    id: 'image-watermark',
    name: 'Image Watermark',
    description:
      'Add a draggable text watermark to a photo and save it locally.',
    path: '/image/image-watermark',
    category: 'image',
    keywords: ['image', 'watermark', 'text', 'photo', 'heic', 'heif'],
    icon: 'stamp',
  },
  {
    id: 'pdf-editor',
    name: 'PDF Editor',
    description: 'Add text, draw, and sign PDFs locally in your browser.',
    path: '/pdf/pdf-editor',
    category: 'pdf',
    keywords: ['pdf', 'editor', 'signature', 'sign', 'draw', 'text'],
    icon: 'file-text',
  },
  {
    id: 'pdf-images',
    name: 'PDF ↔ Images',
    description:
      'Convert PDF pages to PNG or JPEG, or combine images into a PDF, locally in your browser.',
    path: '/pdf/pdf-images',
    category: 'pdf',
    keywords: [
      'pdf',
      'images',
      'png',
      'jpeg',
      'jpg',
      'converter',
      'pages',
      'zip',
    ],
    icon: 'file-text',
  },
  {
    id: 'powerpoint-images',
    name: 'PowerPoint ↔ Images',
    description:
      'Export PPTX slides as images or turn images into a PowerPoint presentation, locally in your browser.',
    path: '/image/powerpoint-images',
    category: 'image',
    keywords: [
      'powerpoint',
      'pptx',
      'ppt',
      'slides',
      'images',
      'png',
      'jpeg',
      'converter',
      'presentation',
    ],
    icon: 'image',
  },
  {
    id: 'pdf-merger',
    name: 'PDF Merger',
    description:
      'Combine PDFs into one document in your chosen order, locally in your browser.',
    path: '/pdf/pdf-merger',
    category: 'pdf',
    keywords: ['pdf', 'merge', 'merger', 'combine', 'join', 'pages'],
    icon: 'file-text',
  },
  {
    id: 'pdf-splitter',
    name: 'PDF Splitter',
    description:
      'Extract selected pages or split a PDF into separate ranges, locally in your browser.',
    path: '/pdf/pdf-splitter',
    category: 'pdf',
    keywords: ['pdf', 'split', 'splitter', 'extract', 'pages', 'range'],
    icon: 'file-text',
  },
] as const satisfies readonly ToolDefinition[];
