import { cn } from '../lib/utils';

const STYLES = {
  success: 'bg-green-950 text-green-400 border-green-800',
  failed: 'bg-red-950 text-red-400 border-red-800',
  error: 'bg-red-950 text-red-400 border-red-800',
  running: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  active: 'bg-green-950 text-green-400 border-green-800',
  paused: 'bg-slate-900 text-slate-400 border-slate-700',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border',
        STYLES[status] || STYLES.paused
      )}
    >
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse-dot" />
      )}
      {status}
    </span>
  );
}
