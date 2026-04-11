import { useState, useEffect, useCallback } from 'react';
import { getFileContent, commitFile, createFile } from '../lib/github';

export default function CodeEditor({ scraper, onClose }) {
  const [code, setCode] = useState('');
  const [originalCode, setOriginalCode] = useState('');
  const [sha, setSha] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [commitMsg, setCommitMsg] = useState('');

  const filePath = scraper.file_path || `scrapers/${scraper.name}.py`;

  useEffect(() => {
    loadFile();
  }, [scraper.name]);

  const loadFile = async () => {
    setLoading(true);
    setError(null);
    try {
      const { content, sha: fileSha } = await getFileContent(filePath);
      setCode(content);
      setOriginalCode(content);
      setSha(fileSha);
    } catch (err) {
      if (err.message.includes('404')) {
        // File doesn't exist yet — new scraper
        const template = `"""
${scraper.display_name} — property listings scraper.
"""

from bs4 import BeautifulSoup
from lib.base_scraper import BaseScraper


class ${toPascalCase(scraper.name)}Scraper(BaseScraper):
    NAME = "${scraper.name}"
    DISPLAY_NAME = "${scraper.display_name}"
    WEBSITE = "${scraper.website || ''}"

    def scrape(self) -> list[dict]:
        results = []
        # TODO: implement scraping logic
        return results


if __name__ == "__main__":
    ${toPascalCase(scraper.name)}Scraper().run()
`;
        setCode(template);
        setOriginalCode('');
        setSha(null);
      } else {
        setError(err.message);
      }
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const msg = commitMsg || `Update ${filePath}`;
      if (sha) {
        const result = await commitFile(filePath, code, msg, sha);
        setSha(result.content.sha);
      } else {
        const result = await createFile(filePath, code, `Add ${filePath}`);
        setSha(result.content.sha);
      }
      setOriginalCode(code);
      setSaved(true);
      setCommitMsg('');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const hasChanges = code !== originalCode;
  const lineCount = code.split('\n').length;

  // Keyboard shortcut
  const handleKeyDown = useCallback(
    (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (hasChanges && !saving) handleSave();
      }
    },
    [hasChanges, saving, code]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="bg-surface-1 rounded-xl border border-surface-4/50 overflow-hidden flex flex-col h-[calc(100vh-140px)]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-surface-3 bg-surface-2">
        <div className="flex items-center gap-3">
          <span className="text-accent-light text-xs font-bold font-mono">{filePath}</span>
          {hasChanges && (
            <span className="text-[10px] text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded-full">
              unsaved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Commit message */}
          <input
            type="text"
            value={commitMsg}
            onChange={(e) => setCommitMsg(e.target.value)}
            placeholder="Commit message (optional)"
            className="px-3 py-1.5 rounded-md bg-surface-1 border border-surface-4 text-gray-300 text-xs font-mono w-56 outline-none focus:border-accent placeholder:text-gray-600"
          />
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
              saved
                ? 'bg-green-800 text-green-200'
                : hasChanges
                ? 'bg-accent text-white hover:bg-accent-light'
                : 'bg-surface-4 text-gray-500 cursor-not-allowed'
            }`}
          >
            {saved ? (
              <>
                <CheckIcon /> Committed
              </>
            ) : saving ? (
              'Pushing...'
            ) : (
              <>
                <SaveIcon /> Commit & Push
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-2.5 py-1.5 rounded-md border border-surface-4 bg-surface-3 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <XIcon />
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 bg-red-950/60 border-b border-red-900/40 text-red-400 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Editor */}
      <div className="flex-1 relative">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Loading file from GitHub...
          </div>
        ) : (
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="w-full h-full p-4 bg-surface-0 text-gray-200 border-none outline-none font-mono text-[13px] leading-7 resize-none"
            style={{ tabSize: 4 }}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-surface-3 bg-surface-2 text-[11px] text-gray-500 font-mono">
        <span>Python • UTF-8</span>
        <span>
          {lineCount} lines {sha ? `• SHA: ${sha.slice(0, 7)}` : '• New file'} •{' '}
          <kbd className="text-gray-600">⌘S</kbd> to save
        </span>
      </div>
    </div>
  );
}

function toPascalCase(str) {
  return str
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}

function SaveIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
