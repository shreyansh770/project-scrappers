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

// ─── Create complete scraper (file + config + workflow) ───

export async function createFullScraper({
  name,
  display_name,
  website,
  schedule,
}) {
  const errors = [];

  // 1. Create the Python scraper file
  const className = name
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");

  const scraperCode = `"""
${display_name} — scraper for ${website}

Auto-generated scraper template. Implement the scrape() method.
"""

from bs4 import BeautifulSoup
from lib.base_scraper import BaseScraper


class ${className}Scraper(BaseScraper):
    NAME = "${name}"
    DISPLAY_NAME = "${display_name}"
    WEBSITE = "${website}"

    def scrape(self) -> list[dict]:
        """
        Implement your scraping logic here.

        Use self.fetch_page(url) for HTTP requests (has retry built in).
        Use self.throttle() between requests to be polite.
        Access config params via self.params (from config.yml).

        Returns a list of dicts — each dict is one scraped record.
        """
        results = []

        # Example:
        # resp = self.fetch_page("https://${website}/listings")
        # soup = BeautifulSoup(resp.text, "lxml")
        #
        # for card in soup.select(".listing-card"):
        #     results.append({
        #         "title": card.select_one(".title").text.strip(),
        #         "price": card.select_one(".price").text.strip(),
        #         "url": card.select_one("a")["href"],
        #     })
        #
        # self.throttle()

        return results


if __name__ == "__main__":
    ${className}Scraper().run()
`;

  try {
    await createFile(`scrapers/${name}.py`, scraperCode, `Add ${name} scraper`);
  } catch (e) {
    errors.push(`Failed to create scraper file: ${e.message}`);
  }

  // 2. Update config.yml - add new scraper entry
  try {
    const { content: configContent, sha: configSha } =
      await getFileContent("config.yml");

    const newScraperConfig = `
  ${name}:
    display_name: "${display_name}"
    website: "${website}"
    schedule: "${schedule}"
    enabled: true
    params: {}
`;

    // Insert before the "# To add a new scraper:" comment
    let updatedConfig = configContent;
    if (configContent.includes("# To add a new scraper:")) {
      updatedConfig = configContent.replace(
        /(\n# To add a new scraper:)/,
        `${newScraperConfig}$1`,
      );
    } else {
      updatedConfig = configContent + newScraperConfig;
    }

    await commitFile(
      "config.yml",
      updatedConfig,
      `Add ${name} to config.yml`,
      configSha,
    );
  } catch (e) {
    errors.push(`Failed to update config.yml: ${e.message}`);
  }

  // 3. Update workflow - add cron schedule and options
  try {
    const { content: workflowContent, sha: workflowSha } = await getFileContent(
      ".github/workflows/run_scrapers.yml",
    );

    let updatedWorkflow = workflowContent;

    // Add cron schedule (before workflow_dispatch) if not already there
    if (!workflowContent.includes(`# ${name}`)) {
      const cronComment = `    - cron: '${schedule}'     # ${name}`;
      updatedWorkflow = updatedWorkflow.replace(
        /(\n  # Manual trigger from dashboard)/,
        `\n${cronComment}$1`,
      );
    }

    // Add to workflow_dispatch options if not already there
    if (!workflowContent.includes(`- ${name}`)) {
      updatedWorkflow = updatedWorkflow.replace(
        /(options:\n(?:          - [^\n]+\n)+)/,
        `$1          - ${name}\n`,
      );
    }

    // Add to "all" matrix arrays
    const addToMatrix = (content) => {
      return content.replace(
        /matrix=\["([^"]+)"\]' >> \$GITHUB_OUTPUT/g,
        (_, scrapers) => {
          const list = scrapers.split('","');
          if (!list.includes(name)) {
            list.push(name);
          }
          return `matrix=["${list.join('","')}"]' >> $GITHUB_OUTPUT`;
        },
      );
    };
    updatedWorkflow = addToMatrix(updatedWorkflow);

    // Add case for cron mapping if not already there
    if (
      !updatedWorkflow.includes(`"${schedule}")`) ||
      !updatedWorkflow.includes(`["${name}"]`)
    ) {
      const caseEntry = `              "${schedule}")     echo 'matrix=["${name}"]' >> $GITHUB_OUTPUT ;;`;
      updatedWorkflow = updatedWorkflow.replace(
        /(\n              \*)               echo 'matrix=\["rightmove_london"\]'/,
        `\n${caseEntry}$1`,
      );
    }

    await commitFile(
      ".github/workflows/run_scrapers.yml",
      updatedWorkflow,
      `Add ${name} to workflow schedule`,
      workflowSha,
    );
  } catch (e) {
    errors.push(`Failed to update workflow: ${e.message}`);
  }

  if (errors.length > 0) {
    console.warn("Some updates failed:", errors);
  }

  return { success: errors.length === 0, name, errors };
}
