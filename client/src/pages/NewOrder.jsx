/**
 * Public student order page (no login).
 *
 * Steps on one screen:
 *   1. Name + phone (required before uploading)
 *   2. Upload files (each converted to PDF and page-counted by the server)
 *   3. Per-file options, live estimate, then place the order
 *
 * The estimate here is only a preview. The server recalculates every price from
 * its own page counts and the current price table when the order is created.
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { addMyOrder } from '../lib/myOrders.js';
import { formatRm, roundRm } from '../lib/money.js';
import { isValidMalaysianPhone } from '../lib/phone.js';
import PageLoader from '../components/PageLoader.jsx';
import OrderItemCard from '../components/OrderItemCard.jsx';

const ACCEPTED_EXTENSIONS = ['.pdf', '.docx', '.jpg', '.jpeg', '.png'];
const DEFAULT_OPTIONS = { copies: 1, colourMode: 'bw', quality: 'normal' };
const MAX_FILES_PER_ORDER = 20;

function extensionOf(filename) {
  return filename.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
}

export default function NewOrder() {
  const [shop, setShop] = useState(null);
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [details, setDetails] = useState({ name: '', phone: '', notes: '' });
  const [items, setItems] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [uploadError, setUploadError] = useState('');
  const [removingToken, setRemovingToken] = useState('');

  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  useEffect(() => {
    let active = true;

    Promise.all([api.get('/public/shop'), api.get('/public/pricing')])
      .then(([shopData, pricingData]) => {
        if (!active) return;
        setShop(shopData);
        setPrices(pricingData.prices);
      })
      .catch((err) => {
        if (active) setLoadError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Live estimate. The server repeats this with its own data.
  const pricedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        itemPrice: roundRm(
          item.pageCount * item.copies * (prices?.[item.colourMode] ?? 0),
        ),
      })),
    [items, prices],
  );

  const totalPrice = useMemo(
    () => roundRm(pricedItems.reduce((sum, item) => sum + item.itemPrice, 0)),
    [pricedItems],
  );

  if (loading) {
    return <PageLoader label="Loading the order form…" />;
  }

  if (loadError) {
    return (
      <div className="card text-center">
        <h1 className="text-lg font-bold text-slate-900">Could not load the order form</h1>
        <p className="mt-2 text-sm text-slate-600">{loadError}</p>
        <button
          type="button"
          className="btn btn-primary mt-5"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  const shopOpen = shop?.shopOpen === true;
  const officeAvailable = shop?.officeAvailable !== false;
  const maxUploadMb = shop?.maxUploadMb ?? 10;
  const maxUploadBytes = maxUploadMb * 1024 * 1024;
  const nameValid = details.name.trim().length >= 2;
  const phoneValid = isValidMalaysianPhone(details.phone);
  const detailsValid = nameValid && phoneValid;
  const canPlaceOrder =
    detailsValid && items.length > 0 && shopOpen && !uploading && !placing;

  if (placedOrder) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
            ✓
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900">
            Order created
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {placedOrder.itemCount} {placedOrder.itemCount === 1 ? 'file' : 'files'} ·{' '}
            <span className="font-bold text-slate-900">{formatRm(placedOrder.totalPrice)}</span>
          </p>

          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Next: pay by QR</p>
            <p className="mt-1">
              Open your order to see the shop&apos;s payment QR, the exact amount and your
              payment reference. Upload the receipt there and the shop will verify it.
            </p>
            <p className="mt-2 text-xs text-slate-500">
              We saved this order on this device so you can find it again under{' '}
              <span className="font-semibold">My orders</span>.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              to={`/order/${placedOrder.publicToken}`}
              className="btn btn-primary"
            >
              Continue to payment
            </Link>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setPlacedOrder(null)}
            >
              Place another order
            </button>
          </div>
        </div>
      </div>
    );
  }

  function updateDetail(field, value) {
    setDetails((current) => ({ ...current, [field]: value }));
  }

  function updateItem(token, patch) {
    setItems((current) =>
      current.map((item) => (item.token === token ? { ...item, ...patch } : item)),
    );
  }

  function addUploadError(message) {
    setUploadError((previous) => (previous ? `${previous}\n${message}` : message));
  }

  function validateFile(file) {
    const extension = extensionOf(file.name);

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      throw new Error('only PDF, DOCX, JPG and PNG files are allowed.');
    }

    if (file.size > maxUploadBytes) {
      throw new Error(`the file is larger than ${maxUploadMb} MB.`);
    }

    if (!officeAvailable && extension !== '.pdf') {
      throw new Error(
        'Word and image uploads are unavailable because LibreOffice is not installed on the shop laptop. Please upload a PDF for now.',
      );
    }
  }

  async function handleFiles(event) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = ''; // allow choosing the same file again later
    if (selected.length === 0) return;

    setUploadError('');
    setPlaceError('');

    const slots = MAX_FILES_PER_ORDER - items.length;
    if (slots <= 0) {
      setUploadError(`An order can contain at most ${MAX_FILES_PER_ORDER} files.`);
      return;
    }

    const files = selected.slice(0, slots);
    if (selected.length > slots) {
      addUploadError(`Only ${slots} more file(s) can be added to this order.`);
    }

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    for (const [index, file] of files.entries()) {
      try {
        validateFile(file);

        const formData = new FormData();
        formData.append('file', file);
        const data = await api.upload('/uploads', formData);

        setItems((current) => [...current, { ...data.upload, ...DEFAULT_OPTIONS }]);
      } catch (err) {
        addUploadError(`${file.name}: ${err.message}`);
      }

      setUploadProgress({ done: index + 1, total: files.length });
    }

    setUploading(false);
  }

  async function handleRemove(item) {
    setRemovingToken(item.token);
    setUploadError('');

    try {
      await api.delete(`/uploads/${item.token}`);
      setItems((current) => current.filter((entry) => entry.token !== item.token));
    } catch (err) {
      addUploadError(`${item.originalName}: ${err.message}`);
    } finally {
      setRemovingToken('');
    }
  }

  async function handlePlaceOrder(event) {
    event.preventDefault();
    if (!canPlaceOrder) return;

    setPlacing(true);
    setPlaceError('');

    try {
      const result = await api.post('/orders', {
        customerName: details.name.trim(),
        customerPhone: details.phone.trim(),
        notes: details.notes.trim(),
        items: items.map((item) => ({
          uploadToken: item.token,
          copies: item.copies,
          colourMode: item.colourMode,
          quality: item.quality,
        })),
      });

      setPlacedOrder(result.order);
      addMyOrder(result.order.publicToken);
      setItems([]);
      setDetails({ name: '', phone: '', notes: '' });
    } catch (err) {
      setPlaceError(err.message);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Link to="/" className="text-sm font-semibold text-emerald-700 hover:underline">
          ← Back to home
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          New print order
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          No account needed — just your name and phone number. You will see the price
          before placing the order.
        </p>
      </div>

      {!shopOpen && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">The shop is currently closed</p>
          <p className="mt-0.5">You can look around, but new orders are paused until it reopens.</p>
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="space-y-5" noValidate>
        {/* Step 1 ---------------------------------------------------------- */}
        <section className="card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">1. Your details</h2>
            {detailsValid && <span className="badge badge-open">Ready</span>}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="customer-name" className="label">
                Name
              </label>
              <input
                id="customer-name"
                type="text"
                className="input"
                value={details.name}
                onChange={(event) => updateDetail('name', event.target.value)}
                autoComplete="name"
                maxLength={80}
                placeholder="Your full name"
                required
              />
              {details.name.length > 0 && !nameValid && (
                <p className="mt-1 text-xs text-red-600">Enter at least 2 characters.</p>
              )}
            </div>

            <div>
              <label htmlFor="customer-phone" className="label">
                Phone number
              </label>
              <input
                id="customer-phone"
                type="tel"
                className="input"
                value={details.phone}
                onChange={(event) => updateDetail('phone', event.target.value)}
                autoComplete="tel"
                inputMode="tel"
                maxLength={30}
                placeholder="012-345 6789"
                required
              />
              {details.phone.length > 0 && !phoneValid && (
                <p className="mt-1 text-xs text-red-600">
                  Enter a Malaysian number, e.g. 012-345 6789.
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="order-notes" className="label">
              Notes for the shop <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="order-notes"
              className="input"
              rows={2}
              maxLength={500}
              value={details.notes}
              onChange={(event) => updateDetail('notes', event.target.value)}
              placeholder="e.g. I will collect after 5pm"
            />
          </div>

          <p className="mt-3 text-xs text-slate-500">
            We use these only to prepare and hand over your order. No account is created.
          </p>
        </section>

        {/* Step 2 ---------------------------------------------------------- */}
        <section className="card">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">2. Your files</h2>
            {items.length > 0 && (
              <span className="text-xs font-semibold text-slate-500">
                {items.length} {items.length === 1 ? 'file' : 'files'}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            Everything is converted to PDF so it can be previewed and printed.
          </p>

          {!detailsValid && (
            <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Enter your name and a valid phone number first to unlock uploads.
            </p>
          )}

          {!officeAvailable && (
            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Word documents and photos are temporarily unavailable: LibreOffice is not
              installed on the shop laptop. PDFs work normally.
            </p>
          )}

          <label
            className={`mt-4 flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${
              !detailsValid || !shopOpen || uploading
                ? 'cursor-not-allowed border-slate-200 bg-slate-50'
                : 'cursor-pointer border-slate-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/40'
            }`}
          >
            <input
              type="file"
              className="sr-only"
              multiple
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              onChange={handleFiles}
              disabled={!detailsValid || !shopOpen || uploading}
            />
            <span className="text-sm font-semibold text-slate-800">
              {uploading ? 'Uploading and converting…' : 'Choose files'}
            </span>
            <span className="text-xs text-slate-500">
              PDF, DOCX, JPG or PNG · up to {maxUploadMb} MB each
            </span>
            <span className="text-xs text-slate-400">You can select several at once</span>
          </label>

          {uploading && (
            <p className="mt-2 text-xs text-emerald-700">
              File {Math.min(uploadProgress.done + 1, uploadProgress.total)} of{' '}
              {uploadProgress.total}…
            </p>
          )}

          {uploadError && (
            <div
              role="alert"
              className="mt-3 whitespace-pre-line rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {uploadError}
            </div>
          )}

          {items.length > 0 && (
            <div className="mt-4 space-y-3">
              {items.map((item) => (
                <OrderItemCard
                  key={item.token}
                  item={item}
                  prices={prices}
                  removing={removingToken === item.token}
                  onChange={(patch) => updateItem(item.token, patch)}
                  onRemove={() => handleRemove(item)}
                />
              ))}
            </div>
          )}

          <p className="mt-4 text-[11px] text-slate-500">
            Your files are used only for printing. They are deleted automatically after
            collection and are never shared.
          </p>
        </section>

        {/* Step 3 ---------------------------------------------------------- */}
        <section className="card">
          <h2 className="section-title">3. Review and place order</h2>

          {pricedItems.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No files added yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {pricedItems.map((item) => (
                <li key={item.token} className="flex items-start justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-700" title={item.originalName}>
                      {item.originalName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.pageCount}p × {item.copies}{' '}
                      {item.colourMode === 'bw' ? 'B&W' : 'colour'}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-slate-900">
                    {formatRm(item.itemPrice)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
            <span className="text-sm font-semibold text-slate-600">Estimated total</span>
            <span className="text-xl font-extrabold text-slate-900">{formatRm(totalPrice)}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            The shop recalculates the final price from the actual page count before
            accepting the order.
          </p>

          {placeError && (
            <div
              role="alert"
              className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {placeError}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary mt-4 w-full"
            disabled={!canPlaceOrder}
          >
            {placing ? 'Placing order…' : 'Place order'}
          </button>

          <p className="mt-2 text-center text-xs text-slate-500">
            QR payment is added in the next milestone. For now the order is saved as
            pending payment.
          </p>
        </section>
      </form>
    </div>
  );
}
