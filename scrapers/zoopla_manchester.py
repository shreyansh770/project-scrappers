"""
Zoopla Manchester — rental listings scraper.
"""

from bs4 import BeautifulSoup
from lib.base_scraper import BaseScraper


class ZooplaManchesterScraper(BaseScraper):
    NAME = "zoopla_manchester"
    DISPLAY_NAME = "Zoopla Manchester"
    WEBSITE = "zoopla.co.uk"

    BASE_URL = "https://www.zoopla.co.uk/to-rent/details/"

    def scrape(self) -> list[dict]:
        results = []

        params = {
            "q": self.params.get("location", "Manchester"),
            "beds_min": self.params.get("min_bedrooms", 1),
            "price_max": self.params.get("max_price", 1500),
            "results_sort": "newest_listings",
            "search_source": "to-rent",
        }

        resp = self.fetch_page(self.BASE_URL, params=params)
        soup = BeautifulSoup(resp.text, "lxml")

        for item in soup.select("[data-testid='search-result']"):
            title_el = item.select_one("h2")
            price_el = item.select_one("[data-testid='listing-price']")
            address_el = item.select_one("[data-testid='listing-address']")
            link_el = item.select_one("a[href*='/to-rent/details/']")

            if not title_el:
                continue

            results.append({
                "title": title_el.text.strip(),
                "price": price_el.text.strip() if price_el else "",
                "address": address_el.text.strip() if address_el else "",
                "url": f"https://www.zoopla.co.uk{link_el['href']}" if link_el and link_el.get("href") else "",
                "source": "zoopla",
                "location": "Manchester",
            })

        return results


if __name__ == "__main__":
    ZooplaManchesterScraper().run()
