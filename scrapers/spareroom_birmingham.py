"""
SpareRoom Birmingham — room listings scraper.
"""

from bs4 import BeautifulSoup
from lib.base_scraper import BaseScraper


class SpareRoomBirminghamScraper(BaseScraper):
    NAME = "spareroom_birmingham"
    DISPLAY_NAME = "SpareRoom Birmingham"
    WEBSITE = "spareroom.co.uk"

    def scrape(self) -> list[dict]:
        location = self.params.get("location", "birmingham")
        url = f"https://www.spareroom.co.uk/flatshare/{location}"

        resp = self.fetch_page(url)
        soup = BeautifulSoup(resp.text, "lxml")
        results = []

        for listing in soup.select(".listing-result"):
            title_el = listing.select_one(".listing-title")
            price_el = listing.select_one(".listing-price")
            avail_el = listing.select_one(".listing-available")
            link_el = listing.select_one("a[href*='/flatshare/']")

            if not title_el:
                continue

            results.append({
                "title": title_el.text.strip(),
                "price": price_el.text.strip() if price_el else "",
                "available_from": avail_el.text.strip() if avail_el else "",
                "url": f"https://www.spareroom.co.uk{link_el['href']}" if link_el and link_el.get("href") else "",
                "source": "spareroom",
                "location": location.title(),
            })

        return results


if __name__ == "__main__":
    SpareRoomBirminghamScraper().run()
