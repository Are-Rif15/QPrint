/**
 * One uploaded file plus its print options and live price.
 */
import { lazy, Suspense, useState } from 'react';
import { formatRm, roundRm } from '../lib/money.js';

// PDF.js is large (~700 kB). Load it only when the student opens a preview,
// so the order form stays quick on mobile.
const PdfPreview = lazy(() => import('./PdfPreview.jsx'));

const QUALITY_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
];

export default function OrderItemCard({
  item,
  prices,
  removing,
  onChange,
  onRemove,
}) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const pricePerPage = prices?.[item.colourMode] ?? 0;
  const itemPrice = roundRm(item.pageCount * item.copies * pricePerPage);

  function handleCopies(event) {
    const parsed = Number.parseInt(event.target.value, 10);
    const copies = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 99) : 1;
    onChange({ copies });
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900" title={item.originalName}>
            {item.originalName}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'} ·{' '}
            {formatRm(itemPrice)}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:text-slate-400"
        >
          {removing ? 'Removing…' : 'Remove'}
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor={`copies-${item.token}`}>
            Copies
          </label>
          <input
            id={`copies-${item.token}`}
            type="number"
            min="1"
            max="99"
            inputMode="numeric"
            className="input"
            value={item.copies}
            onChange={handleCopies}
          />
        </div>

        <div>
          <span className="label">Colour</span>
          <div
            className="mt-1 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1"
            role="group"
            aria-label="Colour mode"
          >
            {[
              { value: 'bw', label: 'B&W' },
              { value: 'colour', label: 'Colour' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={item.colourMode === option.value}
                onClick={() => onChange({ colourMode: option.value })}
                className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                  item.colourMode === option.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor={`quality-${item.token}`}>
            Quality
          </label>
          <select
            id={`quality-${item.token}`}
            className="input"
            value={item.quality}
            onChange={(event) => onChange({ quality: event.target.value })}
          >
            {QUALITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          A4 paper · {item.copies} {item.copies === 1 ? 'copy' : 'copies'}
        </p>
        <button
          type="button"
          onClick={() => setPreviewOpen((open) => !open)}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
        >
          {previewOpen ? 'Hide preview' : 'Preview'}
        </button>
      </div>

      {previewOpen && (
        <Suspense
          fallback={
            <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
              Loading preview…
            </p>
          }
        >
          <PdfPreview url={item.previewUrl} grayscale={item.colourMode === 'bw'} />
        </Suspense>
      )}
    </div>
  );
}
