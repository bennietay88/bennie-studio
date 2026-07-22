from __future__ import annotations

import csv
import re
import ssl
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
CSV_PATH = ROOT / "prospects" / "waas_prospects_1000_enriched_2026-06-07.csv"
OUT_PATH = ROOT / "prospects" / "waas_prospects_1000_enriched_with_social_2026-06-07.csv"
SOCIAL_PATTERNS = {
    "facebook": re.compile(r"https?://(?:www\.)?facebook\.com/[^\"'<>\s)]+", re.I),
    "instagram": re.compile(r"https?://(?:www\.)?instagram\.com/[^\"'<>\s)]+", re.I),
    "linkedin": re.compile(r"https?://(?:[a-z]+\.)?linkedin\.com/[^\"'<>\s)]+", re.I),
    "x_twitter": re.compile(r"https?://(?:www\.)?(?:twitter|x)\.com/[^\"'<>\s)]+", re.I),
}
BAD_SOCIAL_PARTS = (
    "share",
    "sharer",
    "intent/tweet",
    "login",
    "privacy",
    "policies",
)


def normalize_url(url: str) -> str:
    url = (url or "").strip()
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    if not url.startswith(("http://", "https://")):
        return "https://" + url
    return url


def clean_social(url: str) -> str:
    url = url.rstrip("/.,;#")
    if any(part in url.lower() for part in BAD_SOCIAL_PARTS):
        return ""
    return url


def fetch_site(url: str) -> str:
    parsed = urlparse(url)
    if not parsed.netloc:
        return ""
    req = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; BennieStudioProspectResearch/1.0)",
            "Accept": "text/html,application/xhtml+xml",
        },
    )
    context = ssl.create_default_context()
    with urlopen(req, timeout=5, context=context) as response:
        content_type = response.headers.get("content-type", "")
        if "text/html" not in content_type and "application/xhtml+xml" not in content_type:
            return ""
        return response.read(600_000).decode("utf-8", errors="ignore")


def extract_socials(html: str) -> dict[str, str]:
    found: dict[str, str] = {}
    for key, pattern in SOCIAL_PATTERNS.items():
        for match in pattern.findall(html):
            social = clean_social(match)
            if social:
                found[key] = social
                break
    return found


def main() -> None:
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
        fieldnames = f.readline()

    scanned = 0
    updated = 0
    for row in rows:
        website = normalize_url(row.get("existing_website", ""))
        if not website:
            continue
        if row.get("facebook") or row.get("instagram") or row.get("linkedin") or row.get("x_twitter"):
            continue
        scanned += 1
        try:
            html = fetch_site(website)
            socials = extract_socials(html)
        except Exception:
            socials = {}
        if socials:
            row.update(socials)
            updated += 1
        if scanned % 50 == 0:
            print(f"scanned={scanned} updated={updated}", flush=True)

    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        fieldnames = list(csv.DictReader(f).fieldnames or [])
    with OUT_PATH.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"wrote={OUT_PATH}")
    print(f"scanned={scanned} updated={updated}")


if __name__ == "__main__":
    main()
