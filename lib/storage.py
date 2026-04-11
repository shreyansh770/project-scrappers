"""
Supabase storage client for persisting scraper runs and results.
Uses the service role key for full write access.
"""

from supabase import create_client, Client
from lib.config import SUPABASE_URL, SUPABASE_SERVICE_KEY, GITHUB_RUN_ID, GITHUB_SHA
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def ensure_scraper_registered(name: str, display_name: str, website: str, schedule: str, file_path: str) -> str:
    """Ensure scraper exists in DB, return its ID."""
    client = get_client()

    # Check if exists
    result = client.table("scrapers").select("id").eq("name", name).execute()
    if result.data:
        return result.data[0]["id"]

    # Insert
    result = client.table("scrapers").insert({
        "name": name,
        "display_name": display_name,
        "website": website,
        "schedule": schedule,
        "file_path": file_path,
        "status": "active",
    }).execute()

    logger.info(f"Registered new scraper: {name}")
    return result.data[0]["id"]


def create_run(scraper_id: str, scraper_name: str) -> str:
    """Create a new run record, return run ID."""
    client = get_client()
    result = client.table("scraper_runs").insert({
        "scraper_id": scraper_id,
        "scraper_name": scraper_name,
        "status": "running",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "run_metadata": {
            "github_run_id": GITHUB_RUN_ID or None,
            "commit_sha": GITHUB_SHA or None,
        },
    }).execute()
    return result.data[0]["id"]


def complete_run(run_id: str, records_count: int, duration_ms: int):
    """Mark run as successful."""
    client = get_client()
    client.table("scraper_runs").update({
        "status": "success",
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "records_count": records_count,
        "duration_ms": duration_ms,
    }).eq("id", run_id).execute()


def fail_run(run_id: str, error_message: str, error_traceback: str, duration_ms: int):
    """Mark run as failed."""
    client = get_client()
    client.table("scraper_runs").update({
        "status": "failed",
        "finished_at": datetime.now(timezone.utc).isoformat(),
        "duration_ms": duration_ms,
        "error_message": error_message,
        "error_traceback": error_traceback,
    }).eq("id", run_id).execute()


def save_results(run_id: str, scraper_id: str, scraper_name: str, records: list[dict]):
    """Bulk insert scraped records."""
    if not records:
        return

    client = get_client()
    rows = [
        {
            "run_id": run_id,
            "scraper_id": scraper_id,
            "scraper_name": scraper_name,
            "data": record,
        }
        for record in records
    ]

    # Insert in batches of 500
    batch_size = 500
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        client.table("scraper_results").insert(batch).execute()
        logger.info(f"Saved batch {i // batch_size + 1} ({len(batch)} records)")


def update_scraper_status(scraper_id: str, status: str):
    """Update scraper status (active/paused/error)."""
    client = get_client()
    client.table("scrapers").update({"status": status}).eq("id", scraper_id).execute()
