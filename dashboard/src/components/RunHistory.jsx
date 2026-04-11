import { useState } from 'react';
import StatusBadge from './StatusBadge';
import { formatTime, formatDuration } from '../lib/utils';
import { fetchRunResults } from '../lib/supabase';

export default function RunHistory({ runs, loading }) {
  const [expandedId, setExpandedId] = useState(null);
  const [results, setResults] = useState({});
  const [loadingResults, setLoadingResults] = useState(null);

  const handleExpand = async (run) => {
    const id = run.id;
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);

    if (!results[id] && run.status === 'success') {
      setLoadingResults(id);
      try {
        const data = await fetchRunResults(id, 10);
        setResults((prev) => ({ ...prev, [id]: data }));
      } catch (err) {
        console.error('Failed to load results:', err);
      }
      setLoadingResults(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-surface-2 rounded-xl border border-surface-4/50 p-12 text-center text-gray-500">
        Loading run history...
      </div>
    );
  }

  if (!runs.length) {
    return (
      <div className="bg-surface-2 rounded-xl border border-surface-4/50 p-12 text-center text-gray-500">
        No runs yet. Trigger a scraper or wait for the scheduled run.
      </div>
    );
  }

  return (
    <div className="bg-surface-2 rounded-xl border border-surface-4/50 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1.5fr_1fr_0.7fr_0.7fr_0.5fr_24px] items-center px-4 py-2.5 border-b border-surface-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
        <span>Scraper</span>
        <span>Time</span>
        <span>Status</span>
        <span>Records</span>
        <span>Duration</span>
        <span />
      </div>

      {/* Rows */}
      {runs.map((run) => (
        <div key={run.id} className="border-b border-surface-3/50 last:border-b-0">
          <div
            onClick={() => handleExpand(run)}
            className={`grid grid-cols-[1.5fr_1fr_0.7fr_0.7fr_0.5fr_24px] items-center px-4 py-3 cursor-pointer transition-colors ${
              expandedId === run.id ? 'bg-surface-2' : 'hover:bg-surface-2/50'
            }`}
          >
            <span className="text-[13px] text-gray-200 font-medium truncate">
              {run.display_name || run.scraper_name}
            </span>
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <ClockIcon />
              {formatTime(run.started_at)}
            </span>
            <StatusBadge status={run.status} />
            <span className="text-xs text-gray-400 font-mono">{run.records_count ?? 0} rows</span>
            <span className="text-xs text-gray-500">{formatDuration(run.duration_ms)}</span>
            <ChevIcon expanded={expandedId === run.id} />
          </div>

          {/* Expanded details */}
          {expandedId === run.id && (
            <div className="px-4 pb-4 animate-fade-in">
              {run.status === 'failed' && run.error_message && (
                <div className="px-3 py-2.5 rounded-lg text-[12px] bg-red-950/60 border border-red-900/40 text-red-400 font-mono leading-relaxed">
                  <span className="font-bold text-red-300">Error: </span>
                  {run.error_message}
                </div>
              )}

              {run.status === 'success' && (
                <div>
                  <div className="px-3 py-2 rounded-lg text-[12px] bg-green-950/40 border border-green-900/30 text-green-400 font-mono mb-3">
                    Scraped {run.records_count} records in {formatDuration(run.duration_ms)}.
                  </div>

                  {/* Sample results */}
                  {loadingResults === run.id && (
                    <div className="text-xs text-gray-500 py-2">Loading sample results...</div>
                  )}
                  {results[run.id] && results[run.id].length > 0 && (
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                        Sample Results ({results[run.id].length})
                      </div>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto">
                        {results[run.id].map((r) => (
                          <div
                            key={r.id}
                            className="px-3 py-2 rounded bg-surface-1 text-[11px] font-mono text-gray-400 leading-relaxed"
                          >
                            {JSON.stringify(r.data, null, 0).slice(0, 200)}
                            {JSON.stringify(r.data).length > 200 && '...'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GitHub run link */}
                  {run.run_metadata?.github_run_id && (
                    <a
                      href={`https://github.com/${import.meta.env.VITE_GITHUB_REPO}/actions/runs/${run.run_metadata.github_run_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-[11px] text-accent-light hover:underline"
                    >
                      View GitHub Action →
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
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

function ChevIcon({ expanded }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
