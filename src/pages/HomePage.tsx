import ToolCard from '../components/ui/ToolCard';
import { ToolSearchButton } from '../components/ui/ToolSearch';
import { tools } from '../tools/registry';

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
        <div className="mt-8 w-full max-w-md">
          <ToolSearchButton />
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} />
        ))}
      </div>
    </section>
  );
}
