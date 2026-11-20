/**
 * Orders remembered by this browser.
 *
 * Guests have no accounts, so the tokens saved by the order/tracking pages are
 * the whole list. One batch request fetches the summary of each order.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { formatRm } from '../lib/money.js';
import { formatDateTime } from '../lib/datetime.js';
import { forgetMyOrder, listMyOrders } from '../lib/myOrders.js';
import PageLoader from '../components/PageLoader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function MyOrders() {
  const [tokens, setTokens] = useState(() => listMyOrders());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(tokens.length > 0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tokens.length === 0) {
      setOrders([]);
      setError('');
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);

    api
      .post('/orders/lookup', { tokens })
      .then((data) => {
        if (!active) return;

        // Drop saved tokens whose order no longer exists (e.g. database reset)
        // so the list does not keep showing stale links.
        const found = new Set(data.orders.map((order) => order.token));
        const missing = tokens.filter((token) => !found.has(token));
        if (missing.length > 0) {
          for (const token of missing) forgetMyOrder(token);
          setTokens(listMyOrders());
        }

        setOrders(data.orders);
        setError('');
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tokens]);

  function handleForget(token) {
    forgetMyOrder(token);
    setTokens(listMyOrders());
  }

  function handleRetry() {
    setTokens(listMyOrders());
  }

  return (    <div className="space-y-5">
      <div>
        <Link to="/" className="text-sm font-semibold text-emerald-700 hover:underline">
          ← Back to home
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          My orders
        </h1>
        <p className="mt-1 max-w-xl text-sm text-slate-600">
          These orders are remembered in this browser only. If you switch phones or clear
          your site data, use the tracking link you saved instead.
        </p>
      </div>

      {loading && <PageLoader label="Looking up your orders…" />}

      {!loading && error && (
        <div className="card text-center">
          <h2 className="text-lg font-bold text-slate-900">Could not load your orders</h2>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button type="button" className="btn btn-secondary mt-4" onClick={handleRetry}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && tokens.length === 0 && (
        <div className="card text-center">
          <h2 className="text-lg font-bold text-slate-900">No orders on this device yet</h2>
          <p className="mt-2 text-sm text-slate-600">
            Place an order and its tracking link will show up here automatically. You can
            also open a tracking link someone sent you and it will be saved.
          </p>
          <Link to="/order/new" className="btn btn-primary mt-5">
            Start an order
          </Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <>
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.token} className="card">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-bold tracking-wide text-slate-900">
                      {order.reference}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateTime(order.createdAt)} · {order.itemCount}{' '}
                      {order.itemCount === 1 ? 'file' : 'files'} ·{' '}
                      {formatRm(order.totalPrice)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <Link
                    to={`/order/${order.token}`}
                    className="btn btn-primary px-3 py-2 text-xs"
                  >
                    View order
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-red-700"
                    onClick={() => handleForget(order.token)}
                  >
                    Forget
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <Link to="/order/new" className="btn btn-secondary w-full sm:w-auto">
            Start a new order
          </Link>
        </>
      )}
    </div>
  );
}
