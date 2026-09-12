import ToolCard from '../components/ui/ToolCard';
import { toolCategories, tools } from '../tools/registry';

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:py-20">
      <div className="max-w-2xl">
        <span className="badge badge-ghost mb-5 uppercase tracking-[0.16em]">
          Browser-first utilities
        </span>
        <h1 className="text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">
          Small tools for everyday work.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-base-content/60">
          A quiet collection of focused utilities. No accounts, no uploads, and
          no unnecessary setup.
        </p>
      </div>

      <div className="mt-14 space-y-10">
        {toolCategories.map((category) => {
          const categoryTools = tools.filter(
            (tool) => tool.category === category.id,
          );

          return (
            <section aria-labelledby={`${category.id}-tools`} key={category.id}>
              <div className="mb-4 flex items-center gap-3">
                <h2
                  className="text-sm font-semibold uppercase tracking-[0.18em] text-base-content/50"
                  id={`${category.id}-tools`}
                >
                  {category.label}
                </h2>
                <div className="h-px flex-1 bg-base-300" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {categoryTools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
