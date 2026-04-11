import os
import yaml
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
_root = Path(__file__).resolve().parent.parent
load_dotenv(_root / ".env")


def get_env(key: str, required: bool = True) -> str:
    """Get environment variable with validation."""
    value = os.getenv(key, "")
    if required and not value:
        raise EnvironmentError(
            f"Missing required environment variable: {key}\n"
            f"Set it in .env or as a GitHub Actions secret."
        )
    return value


# --- Supabase ---
SUPABASE_URL = get_env("SUPABASE_URL")
SUPABASE_SERVICE_KEY = get_env("SUPABASE_SERVICE_KEY")

# --- GitHub ---
GITHUB_TOKEN = get_env("GITHUB_TOKEN", required=False)
GITHUB_REPO = get_env("GITHUB_REPO", required=False)
GITHUB_BRANCH = get_env("GITHUB_BRANCH", required=False) or "main"

# --- Runtime ---
# Set by GitHub Actions, empty locally
GITHUB_RUN_ID = os.getenv("GITHUB_RUN_ID", "")
GITHUB_SHA = os.getenv("GITHUB_SHA", "")


def load_scraper_config() -> dict:
    """Load config.yml and return the scrapers dict."""
    config_path = _root / "config.yml"
    if not config_path.exists():
        raise FileNotFoundError(f"config.yml not found at {config_path}")
    with open(config_path) as f:
        config = yaml.safe_load(f)
    return config.get("scrapers", {})


def get_scraper_config(scraper_name: str) -> dict:
    """Get config for a specific scraper."""
    all_config = load_scraper_config()
    if scraper_name not in all_config:
        raise KeyError(
            f"Scraper '{scraper_name}' not found in config.yml. "
            f"Available: {list(all_config.keys())}"
        )
    return all_config[scraper_name]
