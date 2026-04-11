#!/usr/bin/env python3
"""
Run all enabled scrapers sequentially.
Usage: python scripts/run_all.py [scraper_name]
"""

import sys
import importlib
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from lib.config import load_scraper_config


# Map scraper names to their module+class
SCRAPER_REGISTRY = {
    "rightmove_london": ("scrapers.rightmove_london", "RightmoveLondonScraper"),
    "zoopla_manchester": ("scrapers.zoopla_manchester", "ZooplaManchesterScraper"),
    "spareroom_birmingham": ("scrapers.spareroom_birmingham", "SpareRoomBirminghamScraper"),
}


def run_scraper(name: str):
    """Dynamically import and run a scraper by name."""
    if name not in SCRAPER_REGISTRY:
        print(f"Unknown scraper: {name}")
        print(f"Available: {list(SCRAPER_REGISTRY.keys())}")
        return False

    module_path, class_name = SCRAPER_REGISTRY[name]
    try:
        module = importlib.import_module(module_path)
        scraper_class = getattr(module, class_name)
        scraper = scraper_class()
        scraper.run()
        return True
    except Exception as e:
        print(f"FAILED: {name} — {e}")
        return False


def main():
    # Run specific scraper if name provided
    if len(sys.argv) > 1:
        name = sys.argv[1]
        success = run_scraper(name)
        sys.exit(0 if success else 1)

    # Run all enabled scrapers
    config = load_scraper_config()
    results = {"success": [], "failed": [], "skipped": []}

    for name, cfg in config.items():
        if not cfg.get("enabled", True):
            print(f"SKIP: {name} (disabled)")
            results["skipped"].append(name)
            continue

        print(f"\n{'='*60}")
        print(f"Running: {name}")
        print(f"{'='*60}")

        if run_scraper(name):
            results["success"].append(name)
        else:
            results["failed"].append(name)

    # Summary
    print(f"\n{'='*60}")
    print(f"RESULTS")
    print(f"{'='*60}")
    print(f"  Success: {len(results['success'])} — {results['success']}")
    print(f"  Failed:  {len(results['failed'])} — {results['failed']}")
    print(f"  Skipped: {len(results['skipped'])} — {results['skipped']}")

    sys.exit(1 if results["failed"] else 0)


if __name__ == "__main__":
    main()
