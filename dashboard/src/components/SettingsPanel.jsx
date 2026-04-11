import { useState } from 'react';
import { setGitHubToken } from '../lib/github';

export default function SettingsPanel({ onClose }) {
  const [token, setToken] = useState(window.__GITHUB_TOKEN || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setGitHubToken(token);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-surface-2 rounded-2xl border border-surface-4 p-7 w-[480px] max-w-[90vw] animate-fade-in">
        <h2 className="text-lg font-extrabold text-gray-100 mb-1">Settings</h2>
        <p className="text-xs text-gray-500 mb-6">Configure GitHub access for the code editor.</p>

        <div className="mb-6">
          <label className="block text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-widest">
            GitHub Personal Access Token
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2.5 rounded-lg bg-surface-0 border border-surface-4 text-gray-200 text-sm font-mono outline-none focus:border-accent"
          />
          <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">
            Needs <code className="text-accent-light">repo</code> scope. Create one at{' '}
            <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="text-accent-light hover:underline">
              github.com/settings/tokens
            </a>
            . Token is stored in memory only (cleared on page refresh).
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
              saved ? 'bg-green-800 text-green-200' : 'bg-accent text-white hover:bg-accent-light'
            }`}
          >
            {saved ? 'Saved!' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-surface-4 text-gray-400 text-sm font-semibold hover:text-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
