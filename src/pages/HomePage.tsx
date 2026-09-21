import ToolCard from '../components/ui/ToolCard';
import { toolCategories, tools } from '../tools/registry';

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-8 lg:py-20">
      <div className="max-w-3xl">
        <span className="badge badge-ghost mb-5 uppercase tracking-[0.16em]">
          Personal utility workspace
        </span>
        <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
          My unified toolkit.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-base-content/60">
          A customized collection of focused tools, organized in one place and
          ready whenever I need them.
        </p>
      </div>

      <div className="mt-16 space-y-12">
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
              <div className="grid gap-4 md:grid-cols-2">
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
