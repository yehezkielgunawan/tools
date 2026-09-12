export type ToolCategory = 'generator' | 'developer';
export type ToolIconName = 'message-circle' | 'braces';

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  path: string;
  category: ToolCategory;
  keywords: readonly string[];
  icon: ToolIconName;
}

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
] as const satisfies readonly ToolDefinition[];
