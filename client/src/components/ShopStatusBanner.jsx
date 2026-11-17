/**
 * Shows whether the shop is accepting orders.
 * `shop` is null while loading and `error` is set when the API is unreachable.
 */
export default function ShopStatusBanner({ shop, error }) {
  if (error) {
    return (
      <div className="rounded-2xl border border-slate-300 bg-white p-4 text-sm text-slate-600">
        <p className="font-semibold text-slate-800">Shop status unavailable</p>
        <p className="mt-0.5">{error}</p>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" aria-hidden="true" />
        <span className="text-sm text-slate-400">Checking shop status…</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${
        shop.shopOpen
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-amber-200 bg-amber-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            shop.shopOpen ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
          aria-hidden="true"
        />
        <div>
          <p
            className={`text-sm font-bold ${
              shop.shopOpen ? 'text-emerald-900' : 'text-amber-900'
            }`}
          >
            {shop.shopOpen ? 'Open for orders' : 'Shop is closed'}
          </p>
          <p
            className={`text-xs ${
              shop.shopOpen ? 'text-emerald-800/80' : 'text-amber-800/80'
            }`}
          >
            {shop.shopOpen
              ? 'Order any time. We print during opening hours.'
              : 'New orders are paused. Please check back later.'}
          </p>
        </div>
      </div>

      <div className="text-xs text-slate-600 sm:text-right">
        {shop.operatingHoursText && <p>{shop.operatingHoursText}</p>}
        {shop.pickupLocation && <p>Pickup: {shop.pickupLocation}</p>}
      </div>
    </div>
  );
}
