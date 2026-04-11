"""
Template scraper — copy this file to create a new scraper.

Steps:
  1. Copy this file: cp _template.py my_scraper_name.py
  2. Update NAME, DISPLAY_NAME, WEBSITE
  3. Implement the scrape() method
  4. Add entry to config.yml
  5. Test locally: python -m scrapers.my_scraper_name
"""

from bs4 import BeautifulSoup
from lib.base_scraper import BaseScraper


class TemplateScraper(BaseScraper):
    NAME = "template_scraper"
    DISPLAY_NAME = "Template Scraper"
    WEBSITE = "example.com"

    def scrape(self) -> list[dict]:
        """
        Your scraping logic here.

        Access config params via self.params (loaded from config.yml).
        Use self.fetch_page(url) for HTTP requests (has retry built in).
        Use self.throttle() between requests to be polite.

        Returns a list of dicts — each dict is one scraped record.
        """
        results = []

        # Example: fetch a page
        # resp = self.fetch_page("https://example.com/listings", params={
        #     "location": self.params.get("location", "London"),
        # })
        # soup = BeautifulSoup(resp.text, "lxml")
        #
        # for card in soup.select(".listing-card"):
        #     results.append({
        #         "title": card.select_one(".title").text.strip(),
        #         "price": card.select_one(".price").text.strip(),
        #         "url": card.select_one("a")["href"],
        #     })
        #
        # self.throttle()  # wait between pages

        return results


if __name__ == "__main__":
    TemplateScraper().run()
