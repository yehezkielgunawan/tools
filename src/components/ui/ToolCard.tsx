import {
  ArrowUpRight,
  Braces,
  FileText,
  Image as ImageIcon,
  MessageCircle,
} from 'lucide-react';
import { Link } from 'react-router';
import type { ToolDefinition } from '../../tools/registry';

const icons = {
  braces: Braces,
  image: ImageIcon,
  'file-text': FileText,
  'message-circle': MessageCircle,
} as const;

interface ToolCardProps {
  tool: ToolDefinition;
}

export default function ToolCard({ tool }: ToolCardProps) {
  const Icon = icons[tool.icon];

  return (
    <Link
      aria-label={tool.name}
      className="card border border-base-300 bg-base-100 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      to={tool.path}
    >
      <div className="card-body gap-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-box bg-primary/10 p-3 text-primary">
            <Icon aria-hidden="true" size={21} strokeWidth={1.8} />
          </div>
          <ArrowUpRight
            aria-hidden="true"
            className="text-base-content/40"
            size={18}
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{tool.name}</h2>
          <p className="mt-2 text-sm leading-6 text-base-content/60">
            {tool.description}
          </p>
        </div>
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-base-content/45">
          {tool.category}
        </span>
      </div>
    </Link>
  );
}
