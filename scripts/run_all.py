#!/usr/bin/env python3
"""
Run scrapers dynamically.
Usage: 
  python scripts/run_all.py [scraper_name]  - Run specific scraper
  python scripts/run_all.py                 - Run all enabled scrapers from config.yml
"""

import sys
import importlib
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from lib.config import load_scraper_config


def discover_scrapers():
    """
    Auto-discover all scraper files in scrapers/ folder.
    Returns dict of {name: file_path}
    """
    scrapers_dir = PROJECT_ROOT / "scrapers"
    discovered = {}
    
    for py_file in scrapers_dir.glob("*.py"):
        name = py_file.stem
        # Skip private/template files
        if name.startswith("_") or name == "__init__":
            continue
        discovered[name] = py_file
    
    return discovered


def get_scraper_class(name: str):
    """
    Dynamically import scraper class by name.
    Converts snake_case name to PascalCase class name.
    e.g., "basic_scrapper" -> BasicScrapperScraper
    """
    module_path = f"scrapers.{name}"
    class_name = "".join(word.capitalize() for word in name.split("_")) + "Scraper"
    
    try:
        module = importlib.import_module(module_path)
        return getattr(module, class_name)
    except (ImportError, AttributeError) as e:
        raise ImportError(f"Could not load {class_name} from {module_path}: {e}")


def run_scraper(name: str):
    """Dynamically import and run a scraper by name."""
    discovered = discover_scrapers()
    
    if name not in discovered:
        print(f"Unknown scraper: {name}")
        print(f"Available: {sorted(discovered.keys())}")
        return False

    try:
        scraper_class = get_scraper_class(name)
        scraper = scraper_class()
        scraper.run()
        return True
    except Exception as e:
        print(f"FAILED: {name} — {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    # Run specific scraper if name provided
    if len(sys.argv) > 1:
        name = sys.argv[1]
        success = run_scraper(name)
        sys.exit(0 if success else 1)

    # Run all enabled scrapers from config
    try:
        config = load_scraper_config()
    except Exception:
        config = {}
    
    discovered = discover_scrapers()
    results = {"success": [], "failed": [], "skipped": []}

    # Run scrapers that are in config and enabled
    for name in discovered:
        cfg = config.get(name, {})
        
        # If not in config, still run it (newly created scrapers)
        # If in config and disabled, skip
        if name in config and not cfg.get("enabled", True):
            print(f"SKIP: {name} (disabled in config)")
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
