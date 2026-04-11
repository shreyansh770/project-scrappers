"""
Base scraper class. All scrapers inherit from this.

Handles:
- Run lifecycle (create run → execute → complete/fail)
- Retry logic with exponential backoff
- Structured logging
- Result persistence to Supabase
- Duration tracking
"""

import logging
import time
import traceback
from abc import ABC, abstractmethod
from typing import Any

import requests
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from lib import storage
from lib.config import get_scraper_config

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)


class BaseScraper(ABC):
    """
    Base class for all property scrapers.

    Subclasses must implement:
        - scrape() -> list[dict]   — the actual scraping logic

    Usage:
        class MyScraperScraper(BaseScraper):
            NAME = "my_scraper"

            def scrape(self) -> list[dict]:
                # ... fetch and parse ...
                return [{"title": "...", "price": "..."}]

        if __name__ == "__main__":
            MyScraperScraper().run()
    """

    # Override in subclass
    NAME: str = ""
    DISPLAY_NAME: str = ""
    WEBSITE: str = ""
    SCHEDULE: str = "0 */6 * * *"
    FILE_PATH: str = ""

    # Request defaults
    DEFAULT_HEADERS = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
    }

    def __init__(self):
        if not self.NAME:
            raise ValueError("Scraper must define NAME")

        self.logger = logging.getLogger(f"scraper.{self.NAME}")

        # Load config from config.yml if available
        try:
            cfg = get_scraper_config(self.NAME)
            self.DISPLAY_NAME = self.DISPLAY_NAME or cfg.get("display_name", self.NAME)
            self.WEBSITE = self.WEBSITE or cfg.get("website", "")
            self.SCHEDULE = cfg.get("schedule", self.SCHEDULE)
            self.params = cfg.get("params", {})
        except (KeyError, FileNotFoundError):
            self.params = {}
            self.logger.warning(f"No config.yml entry for {self.NAME}, using defaults")

        if not self.FILE_PATH:
            self.FILE_PATH = f"scrapers/{self.NAME}.py"

        self.session = requests.Session()
        self.session.headers.update(self.DEFAULT_HEADERS)

    @abstractmethod
    def scrape(self) -> list[dict]:
        """
        Execute the scraping logic and return a list of dicts.
        Each dict is one scraped record (property listing).
        """
        ...

    def run(self):
        """Full run lifecycle: register → create run → scrape → persist."""
        self.logger.info(f"Starting scraper: {self.NAME}")
        start_time = time.time()

        # Register scraper + create run
        try:
            scraper_id = storage.ensure_scraper_registered(
                name=self.NAME,
                display_name=self.DISPLAY_NAME,
                website=self.WEBSITE,
                schedule=self.SCHEDULE,
                file_path=self.FILE_PATH,
            )
            run_id = storage.create_run(scraper_id, self.NAME)
        except Exception as e:
            self.logger.error(f"Failed to initialize run in DB: {e}")
            raise

        # Execute scraping
        try:
            records = self.scrape()
            duration_ms = int((time.time() - start_time) * 1000)

            self.logger.info(f"Scraped {len(records)} records in {duration_ms}ms")

            # Save results
            storage.save_results(run_id, scraper_id, self.NAME, records)
            storage.complete_run(run_id, len(records), duration_ms)
            storage.update_scraper_status(scraper_id, "active")

            self.logger.info(f"Run completed successfully: {len(records)} records saved")
            return records

        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            tb = traceback.format_exc()
            self.logger.error(f"Scraper failed: {e}\n{tb}")

            storage.fail_run(run_id, str(e), tb, duration_ms)
            storage.update_scraper_status(scraper_id, "error")
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=2, min=2, max=30),
        retry=retry_if_exception_type((requests.ConnectionError, requests.Timeout)),
    )
    def fetch_page(self, url: str, params: dict | None = None, **kwargs) -> requests.Response:
        """Fetch a URL with automatic retry on connection errors."""
        self.logger.debug(f"Fetching: {url}")
        resp = self.session.get(url, params=params, timeout=30, **kwargs)
        resp.raise_for_status()
        return resp

    def throttle(self, seconds: float = 2.0):
        """Polite delay between requests."""
        time.sleep(seconds)
