"""
ACC-US — American Campus Communities Scraper

Scrapes student housing listings from americancampus.com API.

Changes from original Apps Script:
 1. MFTE terms are skipped entirely
 2. Fallback dates when API returns blank (term dates + 1 year if past, or 15th of next month)
 3. Limited Availability → availability = "available", noted in message
 4. Upgrades (additional options) produce separate rows with their own price/availability
"""

import re
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from lib.base_scraper import BaseScraper


class BasicScrapperScraper(BaseScraper):
    NAME = "basic_scrapper"
    DISPLAY_NAME = "Basic Scrapper"
    WEBSITE = "americancampus.com"

    BASE_URL = "https://www.americancampus.com/api/lightning/floorplans/"
    DETAIL_URL = "https://www.americancampus.com/api/lightning/floorplandetails/"

    # All property IDs to scrape
    PROPERTY_IDS = [
        685, 687, 411, 675, 674, 226, 227, 672, 671, 462, 228, 410, 700, 692, 702,
        693, 694, 695, 696, 705, 706, 416, 691, 698, 540, 544, 541, 380, 381, 382,
        385, 308, 310, 863, 115, 529, 531, 537, 538, 510, 539, 522, 585, 699, 669,
        689, 402, 403, 423, 592, 686, 690, 581, 682, 684, 704, 360, 205, 300, 301,
        303, 260, 442, 305, 261, 606, 446, 471, 447, 496, 526, 235, 451, 454, 455,
        543, 474, 489, 457, 473, 495, 611, 570, 574, 615, 576, 580, 622, 599, 647,
        653, 677, 608, 546, 206, 291, 207, 210, 214, 290, 448, 450, 557, 710, 559,
        561, 563, 711, 681, 697, 856
    ]

    def scrape(self) -> list[dict]:
        all_results = []

        for prop_id in self.PROPERTY_IDS:
            try:
                rows = self._fetch_property(prop_id)
                all_results.extend(rows)
                self.logger.info(f"Property {prop_id}: {len(rows)} rows")
            except Exception as e:
                self.logger.error(f"Error on property {prop_id}: {e}")

            self.throttle(1.0)

        return all_results

    def _fetch_property(self, prop_id: int) -> list[dict]:
        """Fetch all listings for a single property."""
        resp = self.fetch_page(f"{self.BASE_URL}{prop_id}")
        data = resp.json()
        rows = []

        for term in data.get("Terms", []):
            term_text = (term.get("Text") or "").strip()

            # Skip MFTE terms
            if "MFTE" in term_text.upper():
                self.logger.debug(f"Skipping MFTE term [{term_text}] for property {prop_id}")
                continue

            # Compute fallback dates from term's own date fields
            fallback_start, fallback_end = self._compute_fallback_dates(term)

            for item in term.get("Attributes", []):
                try:
                    detail_resp = self.fetch_page(
                        f"{self.DETAIL_URL}{item['FloorplanID']}/{term['ID']}"
                    )
                    detail = detail_resp.json()

                    for layout in detail.get("Layouts", []):
                        rows.extend(
                            self._process_layout(
                                prop_id, item, layout, term_text,
                                fallback_start, fallback_end
                            )
                        )
                except Exception as e:
                    self.logger.error(
                        f"Detail error {item.get('FloorplanID')}/{term.get('ID')}: {e}"
                    )

        return rows

    def _process_layout(
        self, prop_id: int, item: dict, layout: dict,
        term_text: str, fallback_start: str, fallback_end: str
    ) -> list[dict]:
        """Process a single layout and its upgrades."""
        rows = []

        price = layout.get("AdjustedPrice") or layout.get("Price") or 0
        av_text = (layout.get("Availability", {}).get("AvText") or "").strip()

        availability = self._transform_availability(av_text)
        limited_avail = self._is_limited_availability(av_text)

        # Build IDs
        clean_msg = re.sub(r"[^a-zA-Z0-9]", "", term_text)
        source_id = f"{prop_id}{item.get('Title', '').replace(' ', '')}"
        tenancy_id = f"{source_id}{layout.get('ID', '')}{clean_msg}"

        # Message format
        message = f"Limited Availability | {term_text}" if limited_avail else term_text

        rows.append({
            "start_date": fallback_start,
            "end_date": fallback_end,
            "availability": availability,
            "price": price,
            "inventory_id": str(prop_id),
            "room_name": item.get("Title", ""),
            "source_id": source_id,
            "tenancy_id": tenancy_id,
            "deposit": "",
            "duration": "",
            "property_name": "",  # Would need separate lookup
            "property_location": "",  # Would need separate lookup
            "message": message,
            "term_text": term_text,
            "source": "americancampus",
        })

        # Process upgrades (additional options)
        for upgrade in layout.get("Upgrades", []):
            upg_price = upgrade.get("AdjustedPrice") or upgrade.get("Price") or 0
            upg_av_text = (upgrade.get("Availability", {}).get("AvText") or "").strip()
            upg_availability = self._transform_availability(upg_av_text)
            upg_text = (upgrade.get("Text") or "").strip()

            upg_tenancy_id = (
                f"{source_id}{upgrade.get('ID') or layout.get('ID')}"
                f"{clean_msg}UPG{re.sub(r'[^a-zA-Z0-9]', '', upg_text)}"
            )

            if self._is_limited_availability(upg_av_text):
                upg_message = f"Limited Availability | Additional Features : {upg_text} | {term_text}"
            else:
                upg_message = f"Additional Features : {upg_text} | {term_text}"

            rows.append({
                "start_date": fallback_start,
                "end_date": fallback_end,
                "availability": upg_availability,
                "price": upg_price,
                "inventory_id": str(prop_id),
                "room_name": item.get("Title", ""),
                "source_id": source_id,
                "tenancy_id": upg_tenancy_id,
                "deposit": "",
                "duration": "",
                "property_name": "",
                "property_location": "",
                "message": upg_message,
                "term_text": term_text,
                "source": "americancampus",
            })

        return rows

    def _transform_availability(self, av_text: str) -> str:
        """Convert availability text to canonical value."""
        if not av_text:
            return "not_available"

        t = av_text.lower()
        if "waitlist" in t or "sold out" in t:
            return "not_available"
        if "available" in t:  # includes "Limited Availability"
            return "available"
        return "not_available"

    def _is_limited_availability(self, av_text: str) -> bool:
        """Check if availability is limited but not sold out."""
        if not av_text:
            return False
        t = av_text.lower()
        return "limited" in t and "sold out" not in t and "waitlist" not in t

    def _compute_fallback_dates(self, term: dict) -> tuple[str, str]:
        """
        Derive fallback start/end dates from term object.

        Strategy:
         1. Use term's StartDate/EndDate fields
         2. If date is in past, add years until future
         3. Pin to 15th of the month
         4. If no date found, default to 15th of next/month-after-next
        """
        today = datetime.now()

        # Try various field names the API might use
        raw_start = (
            term.get("StartDate") or term.get("TermStartDate") or
            term.get("TermStart") or term.get("start_date") or
            term.get("startDate")
        )
        raw_end = (
            term.get("EndDate") or term.get("TermEndDate") or
            term.get("TermEnd") or term.get("end_date") or
            term.get("endDate")
        )

        def bump_to_future(date_str: str | None) -> datetime | None:
            if not date_str:
                return None
            try:
                d = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                d = d.replace(tzinfo=None)  # Make naive for comparison
            except (ValueError, AttributeError):
                try:
                    d = datetime.strptime(date_str, "%m/%d/%Y")
                except (ValueError, AttributeError):
                    return None

            while d < today:
                d = d + relativedelta(years=1)
            d = d.replace(day=15)  # Pin to 15th
            return d

        sd = bump_to_future(raw_start)
        ed = bump_to_future(raw_end)

        # Defaults: 15th of next month / month-after-next
        if not sd:
            sd = (today + relativedelta(months=1)).replace(day=15)
        if not ed:
            ed = (today + relativedelta(months=2)).replace(day=15)

        return sd.strftime("%d/%m/%Y"), ed.strftime("%d/%m/%Y")


if __name__ == "__main__":
    BasicScrapperScraper().run()
