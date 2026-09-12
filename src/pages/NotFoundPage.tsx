import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col items-start px-4 py-20 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-base-content/45">
        404
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="mt-3 max-w-md leading-7 text-base-content/60">
        The page you requested does not exist or may have moved.
      </p>
      <Link className="btn mt-8" to="/">
        Back to homepage
      </Link>
    </section>
  );
}
