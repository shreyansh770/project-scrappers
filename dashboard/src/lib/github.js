/**
 * GitHub API client for reading/writing scraper files and triggering runs.
 *
 * NOTE: The GitHub token is stored in localStorage for simplicity.
 * For production, consider a backend proxy to avoid exposing tokens.
 */

const REPO = import.meta.env.VITE_GITHUB_REPO || "";

function getToken() {
  return window.__GITHUB_TOKEN || "";
}

export function setGitHubToken(token) {
  window.__GITHUB_TOKEN = token;
}

async function ghFetch(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error("GitHub token not set. Enter it in Settings.");

  const resp = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(
      `GitHub API ${resp.status}: ${body.message || resp.statusText}`,
    );
  }

  // Handle 204 No Content (e.g., from /dispatches)
  if (resp.status === 204) {
    return { success: true };
  }

  return resp.json();
}

// ─── Read file ───

export async function getFileContent(filePath) {
  const data = await ghFetch(`/contents/${filePath}`);
  const content = atob(data.content.replace(/\n/g, ""));
  return { content, sha: data.sha };
}

// ─── Write file (commit) ───

export async function commitFile(filePath, content, message, sha = null) {
  const body = {
    message: message || `Update ${filePath}`,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: "main",
  };
  if (sha) body.sha = sha;

  return ghFetch(`/contents/${filePath}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

// ─── Create new file ───

export async function createFile(filePath, content, message) {
  return commitFile(filePath, content, message || `Add ${filePath}`);
}

// ─── Trigger scraper run ───

export async function triggerScraperRun(scraperName) {
  return ghFetch("/dispatches", {
    method: "POST",
    body: JSON.stringify({
      event_type: "run-scraper",
      client_payload: { scraper: scraperName },
    }),
  });
}

// ─── List scraper files ───

export async function listScraperFiles() {
  const data = await ghFetch("/contents/scrapers");
  return data
    .filter((f) => f.name.endsWith(".py") && !f.name.startsWith("_"))
    .map((f) => ({ name: f.name, path: f.path, sha: f.sha }));
}
