"""
Rightmove London — rental listings scraper.
Scrapes flat rentals in London from Rightmove.
"""

from bs4 import BeautifulSoup
from lib.base_scraper import BaseScraper


class RightmoveLondonScraper(BaseScraper):
    NAME = "rightmove_london"
    DISPLAY_NAME = "Rightmove London Listings"
    WEBSITE = "rightmove.co.uk"

    BASE_URL = "https://www.rightmove.co.uk/property-to-rent/find.html"
    MAX_PAGES = 5

    def scrape(self) -> list[dict]:
        all_listings = []

        for page in range(self.MAX_PAGES):
            params = {
                "locationIdentifier": self.params.get("location", "REGION^87490"),
                "minBedrooms": self.params.get("min_bedrooms", 1),
                "maxPrice": self.params.get("max_price", 2000),
                "propertyTypes": self.params.get("property_type", "flat"),
                "includeLetAgreed": "false",
                "index": page * 24,
            }

            resp = self.fetch_page(self.BASE_URL, params=params)
            soup = BeautifulSoup(resp.text, "lxml")

            cards = soup.select(".propertyCard")
            if not cards:
                self.logger.info(f"No more results at page {page + 1}")
                break

            for card in cards:
                title_el = card.select_one(".propertyCard-title")
                price_el = card.select_one(".propertyCard-priceValue")
                address_el = card.select_one(".propertyCard-address")
                link_el = card.select_one("a.propertyCard-link")
                desc_el = card.select_one(".propertyCard-description")

                if not title_el or not price_el:
                    continue

                listing = {
                    "title": title_el.text.strip(),
                    "price": price_el.text.strip(),
                    "address": address_el.text.strip() if address_el else "",
                    "description": desc_el.text.strip() if desc_el else "",
                    "url": f"https://www.rightmove.co.uk{link_el['href']}" if link_el and link_el.get("href") else "",
                    "source": "rightmove",
                    "location": "London",
                }
                all_listings.append(listing)

            self.logger.info(f"Page {page + 1}: found {len(cards)} cards (total: {len(all_listings)})")
            self.throttle(2.0)

        return all_listings


if __name__ == "__main__":
    RightmoveLondonScraper().run()
