export default function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-500">
      <span
        className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600"
        aria-hidden="true"
      />
      <p className="text-sm">{label}</p>
    </div>
  );
}
