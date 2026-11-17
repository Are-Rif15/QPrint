import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';

/** Owner sign-in. There is no registration form on purpose. */
export default function OwnerLogin() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Set by RequireOwner when a guest tries to open a protected page.
  const redirectTo = location.state?.from || '/owner';

  // Already signed in? No reason to show the form.
  if (user) {
    return <Navigate to="/owner" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
          Owner access
        </p>
        <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Students do not need an account. This login is only for the shop owner.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="username"
              inputMode="email"
              placeholder="owner@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Your password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={submitting || !email || !password}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 border-t border-slate-200 pt-4 text-xs text-slate-500">
          The owner account is created once by{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">
            npm run init:db
          </code>{' '}
          using the values in <code className="font-mono text-[11px]">.env</code>.
        </p>
      </div>

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link to="/" className="link">
          Back to the shop
        </Link>
      </p>
    </div>
  );
}
