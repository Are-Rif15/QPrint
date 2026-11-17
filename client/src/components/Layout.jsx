import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

/** App shell: header, centred mobile-first content area, small footer. */
export default function Layout() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-lg font-extrabold text-white">
              Q
            </span>
            <span className="text-lg font-bold tracking-tight text-slate-900">QPrint</span>
          </Link>

          <nav className="flex items-center gap-1 text-sm">
            <Link
              to="/"
              className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              Home
            </Link>
            {user ? (
              <Link
                to="/owner"
                className="rounded-lg px-3 py-2 font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/owner/login"
                className="rounded-lg px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                Owner login
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white/60">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-1 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>QPrint · student-run printing on campus</p>
          <p>Files are used only for printing and are deleted after collection.</p>
        </div>
      </footer>
    </div>
  );
}
