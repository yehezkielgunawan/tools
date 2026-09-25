export type ToolCategory = 'generator' | 'developer' | 'image';
export type ToolIconName = 'message-circle' | 'braces' | 'image';

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
] as const satisfies readonly {
  id: ToolCategory;
  label: string;
}[];

export const tools = [
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
    id: 'json-formatter',
    name: 'JSON Formatter',
    description: 'Format, validate, and minify JSON directly in your browser.',
    path: '/developer/json-formatter',
    category: 'developer',
    keywords: ['json', 'formatter', 'validator', 'developer'],
    icon: 'braces',
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
] as const satisfies readonly ToolDefinition[];
