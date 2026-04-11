import { useState } from 'react';

export default function NewScraperModal({ onClose, onCreate }) {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [website, setWebsite] = useState('');
  const [schedule, setSchedule] = useState('0 */6 * * *');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  // Auto-generate display name from snake_case
  const handleNameChange = (val) => {
    setName(val.toLowerCase().replace(/[^a-z0-9_]/g, ''));
    if (!displayName || displayName === autoDisplayName(name)) {
      setDisplayName(autoDisplayName(val));
    }
  };

  const handleSubmit = async () => {
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      await onCreate({
        name,
        display_name: displayName || autoDisplayName(name),
        website,
        schedule,
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-2 rounded-2xl border border-surface-4 p-7 w-[440px] max-w-[90vw] animate-fade-in"
      >
        <h2 className="text-lg font-extrabold text-gray-100 mb-5">New Scraper</h2>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-950/60 border border-red-900/40 text-red-400 text-xs font-mono">
            {error}
          </div>
        )}

        <Field label="Scraper Name" sublabel="snake_case, used as filename">
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. rightmove_london"
            className="input-field"
          />
        </Field>

        <Field label="Display Name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Rightmove London Listings"
            className="input-field"
          />
        </Field>

        <Field label="Target Website">
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="e.g. rightmove.co.uk"
            className="input-field"
          />
        </Field>

        <Field label="Cron Schedule">
          <input
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            placeholder="0 */6 * * *"
            className="input-field"
          />
          <p className="text-[10px] text-gray-600 mt-1">
            {describeCron(schedule)}
          </p>
        </Field>

        <div className="flex gap-2 mt-6">
          <button
            onClick={handleSubmit}
            disabled={!name || creating}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              name
                ? 'bg-accent text-white hover:bg-accent-light'
                : 'bg-surface-4 text-gray-500 cursor-not-allowed'
            }`}
          >
            {creating ? 'Creating...' : 'Create & Open Editor'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-surface-4 text-gray-400 text-sm font-semibold hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      <style>{`
        .input-field {
          width: 100%;
          padding: 10px 14px;
          border-radius: 8px;
          background: #0a0a10;
          border: 1px solid #2a2a3a;
          color: #e2e8f0;
          font-size: 13px;
          font-family: 'JetBrains Mono', monospace;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .input-field:focus {
          border-color: #7c3aed;
        }
        .input-field::placeholder {
          color: #4b5563;
        }
      `}</style>
    </div>
  );
}

function Field({ label, sublabel, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">
        {label}
        {sublabel && <span className="text-gray-600 normal-case tracking-normal ml-2 font-normal">{sublabel}</span>}
      </label>
      {children}
    </div>
  );
}

function autoDisplayName(name) {
  return name
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function describeCron(cron) {
  const parts = cron.split(' ');
  if (parts.length !== 5) return '';
  const [min, hour] = parts;
  if (hour === '*') return 'Every minute (not recommended)';
  if (hour.startsWith('*/')) return `Every ${hour.slice(2)} hours`;
  if (min === '0' && !hour.includes('/') && !hour.includes('*')) return `Daily at ${hour}:00 UTC`;
  return '';
}
