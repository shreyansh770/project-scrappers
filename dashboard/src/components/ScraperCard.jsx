import StatusBadge from './StatusBadge';
import { timeAgo, formatDuration } from '../lib/utils';

export default function ScraperCard({ scraper, onEdit, onViewRuns, onTrigger }) {
  const isFailed = scraper.last_run_status === 'failed';

  return (
    <div
      className={`bg-surface-2 rounded-xl border p-5 flex flex-col gap-3.5 transition-colors ${
        isFailed ? 'border-red-900/30' : 'border-surface-4/50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-gray-100">{scraper.display_name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{scraper.website}</p>
        </div>
        <StatusBadge status={scraper.status} />
      </div>

      {/* Last 2 runs */}
      <div className="grid grid-cols-2 gap-2">
        <RunMini label="Last Run" status={scraper.last_run_status} time={scraper.last_run_time} records={scraper.last_run_records} duration={scraper.last_run_duration_ms} />
        <RunMini label="Previous" status={scraper.prev_run_status} time={scraper.prev_run_time} records={scraper.prev_run_records} duration={scraper.prev_run_duration_ms} />
      </div>

      {/* Error message */}
      {isFailed && scraper.last_run_error && (
        <div className="px-3 py-2 rounded-lg text-[11.5px] bg-red-950/50 border border-red-900/30 text-red-400 font-mono leading-relaxed truncate">
          {scraper.last_run_error}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-surface-3">
        <span className="text-[11px] text-gray-600 font-mono flex items-center gap-1">
          <ClockIcon /> {scraper.schedule}
        </span>
        <div className="flex gap-1.5">
          <button
            onClick={onTrigger}
            className="px-3 py-1.5 rounded-md border border-surface-4 bg-surface-3 text-gray-400 text-[11px] font-semibold hover:text-gray-200 transition-colors"
            title="Trigger run now"
          >
            <PlayIcon />
          </button>
          <button
            onClick={onViewRuns}
            className="px-3 py-1.5 rounded-md border border-surface-4 bg-surface-3 text-gray-400 text-[11px] font-semibold hover:text-gray-200 transition-colors"
          >
            Runs
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 rounded-md bg-accent text-white text-[11px] font-semibold hover:bg-accent-light transition-colors"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function RunMini({ label, status, time, records, duration }) {
  return (
    <div className="bg-surface-1 rounded-lg p-2.5">
      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{label}</div>
      {status ? (
        <>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={status} />
            <span className="text-[11px] text-gray-500">{timeAgo(time)}</span>
          </div>
          <div className="text-xl font-extrabold text-gray-100 mt-1 font-mono">
            {records ?? 0}
            <span className="text-[11px] font-normal text-gray-500 ml-1">records</span>
          </div>
          <div className="text-[10px] text-gray-600 font-mono">{formatDuration(duration)}</div>
        </>
      ) : (
        <div className="text-xs text-gray-600">No runs yet</div>
      )}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
