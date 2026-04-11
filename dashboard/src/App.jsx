import { useState, useEffect, useCallback } from 'react';
import { fetchScrapers, fetchRuns, fetchStats, createScraper } from './lib/supabase';
import { triggerScraperRun } from './lib/github';
import StatsBar from './components/StatsBar';
import ScraperCard from './components/ScraperCard';
import RunHistory from './components/RunHistory';
import CodeEditor from './components/CodeEditor';
import NewScraperModal from './components/NewScraperModal';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [tab, setTab] = useState('overview');
  const [scrapers, setScrapers] = useState([]);
  const [runs, setRuns] = useState([]);
  const [stats, setStats] = useState({ totalScrapers: 0, activeScrapers: 0, failedLast24h: 0, totalRecordsRecent: 0 });
  const [loadingScrapers, setLoadingScrapers] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [editingScraper, setEditingScraper] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [filterScraper, setFilterScraper] = useState(null);
  const [toast, setToast] = useState(null);

  // ─── Data loading ───
  const loadScrapers = useCallback(async () => {
    try {
      const data = await fetchScrapers();
      setScrapers(data);
    } catch (err) {
      console.error('Failed to load scrapers:', err);
    }
    setLoadingScrapers(false);
  }, []);

  const loadRuns = useCallback(async () => {
    try {
      const data = await fetchRuns({ limit: 50 });
      setRuns(data);
    } catch (err) {
      console.error('Failed to load runs:', err);
    }
    setLoadingRuns(false);
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await fetchStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    loadScrapers();
    loadRuns();
    loadStats();

    // Auto-refresh every 30s
    const interval = setInterval(() => {
      loadScrapers();
      loadRuns();
      loadStats();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // ─── Actions ───
  const handleTriggerRun = async (scraper) => {
    try {
      await triggerScraperRun(scraper.name);
      showToast(`Triggered ${scraper.display_name}`);
    } catch (err) {
      showToast(`Failed: ${err.message}`, true);
    }
  };

  const handleCreateScraper = async (config) => {
    const newScraper = await createScraper(config);
    await loadScrapers();
    setEditingScraper(newScraper);
    setShowNewModal(false);
  };

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredRuns = filterScraper
    ? runs.filter((r) => r.scraper_name === filterScraper)
    : runs;

  // ─── Editor view ───
  if (editingScraper) {
    return (
      <div className="min-h-screen bg-surface-0 p-6 font-sans">
        <CodeEditor scraper={editingScraper} onClose={() => { setEditingScraper(null); loadScrapers(); }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 font-sans text-gray-200">
      {/* Modals */}
      {showNewModal && <NewScraperModal onClose={() => setShowNewModal(false)} onCreate={handleCreateScraper} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-lg animate-fade-in ${
          toast.isError ? 'bg-red-900 text-red-200' : 'bg-green-900 text-green-200'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-surface-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
            <TerminalIcon />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">Scraper Hub</h1>
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <GithubIcon />
              {import.meta.env.VITE_GITHUB_REPO || 'your-org/property-scrapers'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex gap-0.5 bg-surface-2 rounded-lg p-0.5">
            {['overview', 'runs'].map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setFilterScraper(null); }}
                className={`px-4 py-2 rounded-md text-xs font-semibold capitalize transition-colors ${
                  tab === t ? 'bg-surface-3 text-gray-100' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {t === 'runs' ? 'Run History' : t}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-2 rounded-lg border border-surface-4 text-gray-400 text-xs font-semibold hover:text-gray-200 transition-colors"
            title="Settings"
          >
            <GearIcon />
          </button>

          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent-light transition-colors"
          >
            <PlusIcon /> New Scraper
          </button>
        </div>
      </header>

      {/* Stats */}
      <StatsBar stats={stats} />

      {/* Content */}
      <main className="p-6">
        {tab === 'overview' && (
          <>
            {loadingScrapers ? (
              <div className="text-center text-gray-500 py-20">Loading scrapers...</div>
            ) : scrapers.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 mb-4">No scrapers configured yet.</p>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="px-6 py-2.5 rounded-lg bg-accent text-white font-bold text-sm hover:bg-accent-light"
                >
                  Create your first scraper
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {scrapers.map((s) => (
                  <ScraperCard
                    key={s.id}
                    scraper={s}
                    onEdit={() => setEditingScraper(s)}
                    onViewRuns={() => { setTab('runs'); setFilterScraper(s.name); }}
                    onTrigger={() => handleTriggerRun(s)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'runs' && (
          <div>
            {/* Filter bar */}
            {filterScraper && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs text-gray-500">Filtered by:</span>
                <span className="text-xs font-bold text-accent-light bg-accent/10 px-2.5 py-1 rounded-full">
                  {filterScraper}
                </span>
                <button
                  onClick={() => setFilterScraper(null)}
                  className="text-[10px] text-gray-500 hover:text-gray-300 ml-1"
                >
                  Clear
                </button>
              </div>
            )}
            <RunHistory runs={filteredRuns} loading={loadingRuns} />
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Icons ───

function TerminalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
