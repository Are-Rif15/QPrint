import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
        404
      </p>
      <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        The link may be mistyped, or the page has moved.
      </p>
      <Link to="/" className="btn btn-primary mt-6">
        Back to the shop
      </Link>
    </div>
  );
}
