/**
 * Public order tracking and payment page.
 *
 * The token in the URL is the student's only credential. The page shows the
 * live status, the shop's QR, and the proof upload while payment is due. It
 * polls quietly while the order is active and stops once it is final.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { formatRm } from '../lib/money.js';
import { formatDateTime } from '../lib/datetime.js';
import { isTerminalStatus, statusMeta } from '../lib/orderStatus.js';
import { addMyOrder } from '../lib/myOrders.js';
import PageLoader from '../components/PageLoader.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import StatusTimeline from '../components/StatusTimeline.jsx';
import PaymentProofUpload from '../components/PaymentProofUpload.jsx';

const POLL_MS = 15_000;
const POST_PRINT_STATUSES = ['queued', 'printing', 'ready', 'collected'];

export default function OrderTracking() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState('');
  const [qrUnavailable, setQrUnavailable] = useState(false);
  const [qrEnlarged, setQrEnlarged] = useState(false);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);

      try {
        const data = await api.get(`/orders/${token}`);
        setOrder(data.order);
        setError('');
        // Opening a shared tracking link also saves it on this device.
        addMyOrder(data.order.token);
      } catch (err) {
        if (!silent) setError(err.message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    setOrder(null);
    setError('');
    load();
  }, [load]);

  const status = order?.status;

  // Refresh while the order is still moving. Skip hidden tabs to save battery.
  useEffect(() => {
    if (!status || isTerminalStatus(status)) return undefined;

    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') load({ silent: true });
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [status, load]);

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') load({ silent: true });
    }

    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => document.removeEventListener('visibilitychange', refreshWhenVisible);
  }, [load]);

  // The enlarged QR is a small modal: Escape closes it and the page behind it
  // does not scroll while it is open.
  useEffect(() => {
    if (!qrEnlarged) return undefined;

    function closeOnEscape(event) {
      if (event.key === 'Escape') setQrEnlarged(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [qrEnlarged]);

  async function handleCancel() {
    if (!window.confirm('Cancel this order? Your files will not be printed.')) return;

    setCancelling(true);
    setActionError('');

    try {
      const data = await api.post(`/orders/${token}/cancel`, {});
      setOrder(data.order);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return <PageLoader label="Loading your order…" />;
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="card text-center">
          <h1 className="text-lg font-bold text-slate-900">Order not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            {error || 'This tracking link is not valid. Check that you copied the whole link.'}
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link to="/" className="btn btn-primary">
              Back to home
            </Link>
            <Link to="/orders" className="btn btn-secondary">
              My orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const meta = statusMeta(order.status);
  const attemptsLeft = Math.max(0, order.maxPaymentAttempts - order.paymentAttempts);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link to="/" className="text-sm font-semibold text-emerald-700 hover:underline">
          ← Back to home
        </Link>
        <Link to="/orders" className="text-sm font-semibold text-emerald-700 hover:underline">
          My orders
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
            Order {order.reference}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {meta.label}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-600">{meta.hint}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.status === 'pending_payment' && (
        <section className="card">
          <h2 className="section-title">Pay {formatRm(order.totalPrice)}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Scan the shop&apos;s DuitNow QR with your banking app, then upload your receipt.
          </p>

          <div className="mt-4 grid gap-4 sm:grid-cols-[15rem,1fr] sm:items-start">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              {order.paymentQrAvailable && !qrUnavailable ? (
                <button
                  type="button"
                  className="group block w-full rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
                  onClick={() => setQrEnlarged(true)}
                  aria-label="Enlarge the shop payment QR code"
                >
                  <img
                    src="/api/public/payment-qr"
                    alt="Shop payment QR code"
                    className="mx-auto h-52 w-52 object-contain"
                    onError={() => setQrUnavailable(true)}
                  />
                  <span className="mt-2 block text-center text-xs font-semibold text-emerald-700 group-hover:underline">
                    Tap to enlarge
                  </span>
                </button>
              ) : (
                <p className="px-2 py-10 text-center text-xs text-slate-500">
                  The shop has not added its payment QR yet. Pay at the counter or ask
                  the shop for the QR.
                </p>
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Amount
                </p>
                <p className="text-2xl font-extrabold text-slate-900">
                  {formatRm(order.totalPrice)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Payment reference
                </p>
                <p className="font-mono text-lg font-bold tracking-wider text-slate-900">
                  {order.reference}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Put this in the transfer note so the shop can match your payment.
                </p>
              </div>

              <p className="text-xs text-slate-500">
                Pay the exact amount. Your order joins the print queue only after the shop
                verifies the proof.
              </p>
            </div>
          </div>

          <h3 className="mt-5 text-sm font-bold text-slate-900">Upload your proof</h3>
          <PaymentProofUpload
            token={order.token}
            maxUploadMb={order.maxUploadMb}
            onSubmitted={setOrder}
          />
        </section>
      )}

      {order.status === 'pending_verification' && (
        <section className="card">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-100 text-lg text-sky-700">
              ✓
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Proof received</h2>
              <p className="mt-1 text-sm text-slate-600">
                The shop will check your payment and move the order to the print queue.
                {order.payment?.submittedAt &&
                  ` You sent the proof on ${formatDateTime(order.payment.submittedAt)}.`}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                This page updates automatically. You can also refresh it later.
              </p>
            </div>
          </div>
        </section>
      )}

      {order.status === 'rejected' && (
        <section className="card border-red-200">
          <h2 className="text-lg font-bold text-red-900">We could not verify your payment</h2>
          {order.payment?.rejectReason && (
            <p className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {order.payment.rejectReason}
            </p>
          )}

          {order.canSubmitProof ? (
            <>
              <p className="mt-3 text-sm text-slate-600">
                Upload a new screenshot or receipt. {attemptsLeft}{' '}
                {attemptsLeft === 1 ? 'attempt' : 'attempts'} left.
              </p>
              <PaymentProofUpload
                token={order.token}
                maxUploadMb={order.maxUploadMb}
                onSubmitted={setOrder}
              />
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Please contact the shop directly so they can check your payment manually.
            </p>
          )}
        </section>
      )}

      {POST_PRINT_STATUSES.includes(order.status) && (
        <section className="card">
          <h2 className="section-title">{meta.label}</h2>
          <p className="mt-1 text-sm text-slate-600">{meta.hint}</p>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Pickup
              </dt>
              <dd className="mt-0.5 text-slate-800">
                {order.pickupLocation || 'Ask the shop'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Shop hours
              </dt>
              <dd className="mt-0.5 text-slate-800">
                {order.operatingHoursText || 'Ask the shop'}
              </dd>
            </div>
          </dl>

          {order.status !== 'collected' && (
            <p className="mt-3 text-xs text-slate-500">
              Keep this link — it always shows the latest status.
            </p>
          )}
        </section>
      )}

      {order.status === 'cancelled' && (
        <section className="card">
          <h2 className="text-lg font-bold text-slate-900">Order cancelled</h2>
          <p className="mt-1 text-sm text-slate-600">
            This order will not be printed and no payment is needed. Start a new order
            whenever you are ready.
          </p>
          <Link to="/order/new" className="btn btn-primary mt-4">
            Start a new order
          </Link>
        </section>
      )}

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title">Order details</h2>
          <span className="text-lg font-extrabold text-slate-900">
            {formatRm(order.totalPrice)}
          </span>
        </div>

        <ul className="mt-3 divide-y divide-slate-100">
          {order.items.map((item, index) => (
            <li
              key={`${item.originalName}-${index}`}
              className="flex items-start justify-between gap-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-700" title={item.originalName}>
                  {item.originalName}
                </p>
                <p className="text-xs text-slate-500">
                  {item.pageCount}p × {item.copies} ·{' '}
                  {item.colourMode === 'bw' ? 'B&W' : 'Colour'} · {item.quality} ·{' '}
                  {item.paperSize}
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold text-slate-900">
                {formatRm(item.itemPrice)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs text-slate-500">
          <p>
            Placed {formatDateTime(order.createdAt)} for {order.customerName}
          </p>
          {order.notes && <p>Note for the shop: “{order.notes}”</p>}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Progress</h2>
        <div className="mt-4">
          <StatusTimeline timeline={order.timeline} />
        </div>
      </section>

      {order.canCancel && (
        <section className="card">
          <h2 className="text-sm font-bold text-slate-900">Need to cancel?</h2>
          <p className="mt-1 text-sm text-slate-600">
            You can cancel before payment is verified. Your files will not be printed.
          </p>

          {actionError && (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {actionError}
            </div>
          )}

          <button
            type="button"
            className="btn btn-secondary mt-3 text-red-700"
            onClick={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling…' : 'Cancel order'}
          </button>
        </section>
      )}

      <p className="text-center text-xs text-slate-500">
        This order is saved on this device. Open{' '}
        <Link to="/orders" className="link">
          My orders
        </Link>{' '}
        to find it again.
      </p>

      {qrEnlarged && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Shop payment QR code"
          onClick={() => setQrEnlarged(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src="/api/public/payment-qr"
              alt="Shop payment QR code, enlarged"
              className="mx-auto aspect-square w-full max-w-[22rem] rounded-lg bg-white object-contain"
            />
            <p className="mt-3 text-center text-sm font-semibold text-slate-800">
              Scan with your banking app
            </p>
            <p className="mt-1 text-center text-xs text-slate-500">
              Pay {formatRm(order.totalPrice)} and put {order.reference} in the note.
            </p>
            <button
              type="button"
              className="btn btn-secondary mt-4 w-full"
              onClick={() => setQrEnlarged(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
