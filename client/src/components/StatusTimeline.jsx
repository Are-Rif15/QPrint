import { statusMeta } from '../lib/orderStatus.js';
import { formatDateTime } from '../lib/datetime.js';

/**
 * The order's real status history, oldest first.
 *
 * Using status_log (not a guessed progress bar) means a rejected payment,
 * cancellation or print retry is shown exactly as it happened.
 */
export default function StatusTimeline({ timeline }) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <ol className="space-y-4 border-l border-slate-200 pl-5">
      {timeline.map((entry, index) => {
        const meta = statusMeta(entry.status);
        const isLatest = index === timeline.length - 1;
        const dotColour =
          entry.status === 'rejected'
            ? 'bg-red-500'
            : entry.status === 'cancelled'
              ? 'bg-slate-400'
              : isLatest
                ? 'bg-emerald-500'
                : 'bg-slate-300';

        return (
          <li key={`${entry.status}-${entry.changedAt}`} className="relative">
            <span
              className={`absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white ${dotColour}`}
              aria-hidden="true"
            />
            <p
              className={`text-sm ${isLatest ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}
            >
              {meta.label}
            </p>
            <p className="text-xs text-slate-500">{formatDateTime(entry.changedAt)}</p>
          </li>
        );
      })}
    </ol>
  );
}
