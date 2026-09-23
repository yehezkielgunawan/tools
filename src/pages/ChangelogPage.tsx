import { APP_VERSION } from '../config/app';
import { CHANGELOG, type ChangeType } from '../config/changelog';

const SECTION_ORDER: readonly ChangeType[] = [
  'features',
  'fixes',
  'performance',
  'refactors',
  'other',
];

const SECTION_LABELS: Record<ChangeType, string> = {
  features: 'Features',
  fixes: 'Bug Fixes',
  performance: 'Performance',
  refactors: 'Refactors',
  other: 'Other Changes',
};

function formatReleaseDate(date: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

export default function ChangelogPage() {
  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-8 lg:py-20">
      <header className="max-w-3xl">
        <span className="badge badge-ghost uppercase tracking-[0.16em]">
          Release notes
        </span>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            Changelog
          </h1>
          <span className="badge badge-primary badge-outline">
            v{APP_VERSION}
          </span>
        </div>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-base-content/60">
          All notable changes to tools.yehezgun.com.
        </p>
      </header>

      <div className="mt-16 space-y-8">
        {CHANGELOG.map((release) => (
          <article
            aria-labelledby={`release-${release.version}`}
            className="card card-border bg-base-100 shadow-sm"
            key={release.version}
          >
            <div className="card-body p-5 sm:p-8">
              <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-base-300 pb-5">
                <h2
                  className="text-2xl font-semibold tracking-tight"
                  id={`release-${release.version}`}
                >
                  v{release.version}
                </h2>
                <time
                  className="text-sm text-base-content/55"
                  dateTime={release.date}
                >
                  {formatReleaseDate(release.date)}
                </time>
              </header>

              <div className="mt-6 grid gap-7 sm:grid-cols-2">
                {SECTION_ORDER.map((section) => {
                  const items = release.changes[section];
                  if (!items?.length) {
                    return null;
                  }

                  return (
                    <section
                      aria-labelledby={`release-${release.version}-${section}`}
                      key={section}
                    >
                      <h3
                        className="text-xs font-bold uppercase tracking-[0.18em] text-base-content/50"
                        id={`release-${release.version}-${section}`}
                      >
                        {SECTION_LABELS[section]}
                      </h3>
                      <ul className="mt-3 space-y-3">
                        {items.map((item) => (
                          <li
                            className="flex items-start gap-2.5 text-sm leading-6"
                            key={`${item.scope ?? 'change'}-${item.description}`}
                          >
                            {item.scope ? (
                              <span className="badge badge-ghost badge-sm mt-0.5 shrink-0">
                                {item.scope}
                              </span>
                            ) : null}
                            <span>{item.description}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
