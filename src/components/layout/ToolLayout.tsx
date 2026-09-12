import { ArrowLeft, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface ToolLayoutProps {
  category: string;
  children: ReactNode;
  description: string;
  title: string;
}

export default function ToolLayout({
  category,
  children,
  description,
  title,
}: ToolLayoutProps) {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:py-12">
      <Link
        className="link link-hover inline-flex items-center gap-2 text-sm text-base-content/60 no-underline"
        to="/"
      >
        <ArrowLeft aria-hidden="true" size={15} />
        All tools
      </Link>

      <div className="mt-8">
        <div className="max-w-2xl">
          <span className="badge badge-ghost mb-4 uppercase tracking-[0.16em]">
            {category}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-base leading-7 text-base-content/65">
            {description}
          </p>
        </div>

        <div className="card mt-8 border border-base-300 bg-base-100 shadow-sm">
          <div className="card-body p-4 sm:p-6">{children}</div>
        </div>

        <p className="mt-4 flex items-start gap-2 text-sm leading-6 text-base-content/55">
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 shrink-0"
            size={16}
          />
          <span>
            Runs locally in your browser. Your data is not uploaded to a server.
          </span>
        </p>
      </div>
    </section>
  );
}
