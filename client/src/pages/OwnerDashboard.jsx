import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

const upcoming = [
  {
    title: 'Orders & payments',
    milestone: 'Milestone 4',
    text: 'Review new orders, check payment proofs and confirm or reject payments.',
  },
  {
    title: 'Print queue',
    milestone: 'Milestone 5',
    text: 'Watch the live queue, see which order is printing and retry failed jobs.',
  },
  {
    title: 'Shop settings',
    milestone: 'Milestone 4',
    text: 'Open or close the shop, edit prices and upload your payment QR image.',
  },
];

/** Owner landing page. Empty shell until Milestones 4 and 5. */
export default function OwnerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function handleLogout() {
    setSigningOut(true);
    try {
      await logout();
      navigate('/owner/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Owner dashboard
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Welcome, {user.name}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">{user.email}</p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="btn btn-secondary"
          disabled={signingOut}
        >
          {signingOut ? 'Signing out…' : 'Log out'}
        </button>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-bold">Milestone 1 is live</p>
        <p className="mt-1 text-emerald-800">
          You are signed in with a secure httpOnly cookie. Refresh this page and you
          stay signed in; log out and the cookie is cleared.
        </p>
      </div>

      <section>
        <h2 className="section-title mb-3">Coming next</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {upcoming.map((item) => (
            <div key={item.title} className="card">
              <span className="badge bg-slate-100 text-slate-600">{item.milestone}</span>
              <h3 className="mt-3 text-sm font-bold text-slate-900">{item.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">What you can check now</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-600">
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            Signing in and out works, and the session survives a page refresh.
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            Opening <code className="font-mono text-xs">/owner</code> in a private
            window redirects to the login page.
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            The home page shows the live open/closed state from the database.
          </li>
          <li className="flex gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
            <code className="font-mono text-xs">npm test</code> passes the price and
            status-transition tests.
          </li>
        </ol>
      </section>
    </div>
  );
}
