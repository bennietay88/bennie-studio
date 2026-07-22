from __future__ import annotations

import csv
import html
import re
from pathlib import Path
from urllib.parse import urljoin


ROOT = Path(__file__).resolve().parent.parent
TMP = ROOT / "prospects" / "tmp"
OUT = ROOT / "prospects" / "waas_prospects_1000_enriched_2026-06-07.csv"


FIELDS = [
    "priority",
    "business_name",
    "market",
    "city_area",
    "niche",
    "phone",
    "whatsapp",
    "email",
    "existing_website",
    "facebook",
    "instagram",
    "linkedin",
    "x_twitter",
    "contact_page_or_listing",
    "contact_confidence",
    "source_note",
    "pitch_angle",
]


def clean(value: str | None) -> str:
    if not value:
        return ""
    value = html.unescape(value)
    value = re.sub(r"<[^>]+>", " ", value)
    value = value.replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def tel_to_display(tel: str) -> str:
    return clean(tel).replace("tel:", "").replace(" ", "")


def wa_link(phone: str) -> str:
    digits = re.sub(r"\D+", "", phone or "")
    if not digits:
        return ""
    if digits.startswith("0") and len(digits) >= 10:
        return ""
    return f"https://wa.me/{digits}"


def london_pitch(niche: str) -> str:
    lower = niche.lower()
    if "plumber" in lower:
        return "Emergency/local service website with click-to-call, quote form, service areas, and trust proof"
    if "electric" in lower:
        return "Local electrician website with emergency CTA, certificates, services, and quote requests"
    if "builder" in lower:
        return "Contractor website with project gallery, quote CTA, and local service-area pages"
    if "dent" in lower:
        return "Clinic website with appointment CTA, treatment sections, reviews, and local SEO"
    if "account" in lower:
        return "Professional service website with consultation CTA, package sections, and enquiry form"
    if "solicitor" in lower or "law" in lower:
        return "Legal service website with practice areas, trust sections, and consultation CTA"
    if "estate" in lower:
        return "Property lead website with valuation CTA, listings/service pages, and local SEO"
    if "decor" in lower:
        return "Home improvement website with portfolio gallery, quote CTA, and service-area positioning"
    return "Managed website subscription with enquiry-focused CTA and local SEO"


def parse_londonpages() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for path in sorted((TMP / "londonpages").glob("*.html")):
        text = path.read_text(errors="ignore")
        category_slug = path.stem.rsplit("_", 1)[0]
        source_url = f"https://directory.londonpages.co.uk/search/london/{category_slug.replace('_', '-')}"
        blocks = re.split(r'<div class="container serp serp mb-2 py-2"', text)[1:]
        for block in blocks:
            name = clean(re.search(r'class="align-middle mr-3"[^>]*>\s*(.*?)\s*</a>', block, re.S).group(1) if re.search(r'class="align-middle mr-3"[^>]*>\s*(.*?)\s*</a>', block, re.S) else "")
            if not name:
                continue
            profile_match = re.search(r'href="(/company/[^"]+)"', block)
            profile = urljoin("https://directory.londonpages.co.uk", profile_match.group(1)) if profile_match else source_url
            cat = clean(re.search(r'class="serp-cat[^"]*"[^>]*>(.*?)</span>', block, re.S).group(1) if re.search(r'class="serp-cat[^"]*"[^>]*>(.*?)</span>', block, re.S) else category_slug.replace("-", " ").title())
            address = clean(re.search(r'class="serp-address"[^>]*>(.*?)</p>', block, re.S).group(1) if re.search(r'class="serp-address"[^>]*>(.*?)</p>', block, re.S) else "London")
            phone = tel_to_display(re.search(r'href="(tel:[^"]+)"', block).group(1) if re.search(r'href="(tel:[^"]+)"', block) else "")
            website_match = re.search(r'class="serp-site[^"]*"[^>]*[^>]+href="([^"]+)"', block, re.S)
            website = clean(website_match.group(1)) if website_match else ""
            message_match = re.search(r'class="serp-email[^"]*"[^>]*href="([^"]+)"', block, re.S)
            contact_route = urljoin("https://directory.londonpages.co.uk", message_match.group(1)) if message_match else profile
            rows.append(
                {
                    "business_name": name,
                    "market": "UK",
                    "city_area": address,
                    "niche": cat,
                    "phone": phone,
                    "whatsapp": "",
                    "email": "",
                    "existing_website": website,
                    "facebook": "",
                    "instagram": "",
                    "linkedin": "",
                    "x_twitter": "",
                    "contact_page_or_listing": contact_route,
                    "contact_confidence": "High" if phone or website else "Medium",
                    "source_note": f"LondonPages public {cat} directory",
                    "pitch_angle": london_pitch(cat),
                }
            )
    return rows


def parse_msp_kl_dental() -> list[dict[str, str]]:
    path = TMP / "msp_kl_dental.txt"
    if not path.exists():
        return []
    rows: list[dict[str, str]] = []
    text = path.read_text(errors="ignore")
    lines = [clean(line) for line in text.splitlines()]
    skip_prefixes = ("Name of Private Clinic", "Clinic Telephone", "", "")
    for line in lines:
        if not line or line.startswith(skip_prefixes):
            continue
        phone_match = re.search(r"\b(60\d{8,11}|603\d{7,9})\b", line)
        if not phone_match:
            continue
        phone = f"+{phone_match.group(1)}"
        before = line[: phone_match.start()].strip()
        name = before
        # Clinic names end before the first common address marker.
        for marker in [" No.", " Lot ", " Level ", " 01-", " 2-", " 19-", " 27-", " 52,", " Unit ", " L1,", " Ground "]:
            if marker in name:
                name = name.split(marker)[0]
                break
        name = clean(name)
        if len(name) < 4 or "Kuala Lumpur" in name[:20]:
            continue
        rows.append(
            {
                "business_name": name,
                "market": "Malaysia",
                "city_area": "Kuala Lumpur",
                "niche": "Dental clinic",
                "phone": phone,
                "whatsapp": wa_link(phone),
                "email": "",
                "existing_website": "",
                "facebook": "",
                "instagram": "",
                "linkedin": "",
                "x_twitter": "",
                "contact_page_or_listing": "https://msp.org.my/wp-content/uploads/2025/05/tinywow_WPKL-updated-14052025_80389310_5.pdf",
                "contact_confidence": "High",
                "source_note": "MSP Kuala Lumpur private dental clinic list",
                "pitch_angle": "Dental appointment website with WhatsApp CTA, treatment sections, patient FAQ, and local SEO",
            }
        )
    return rows


def load_existing_enriched() -> list[dict[str, str]]:
    path = ROOT / "prospects" / "waas_prospects_100_enriched_contacts_2026-06-07.csv"
    if not path.exists():
        return []
    with path.open(newline="", encoding="utf-8") as f:
        loaded = list(csv.DictReader(f))
    rows = []
    for row in loaded:
        rows.append({field: row.get(field, "") for field in FIELDS if field != "priority"})
    return rows


def dedupe(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    seen = set()
    deduped = []
    for row in rows:
        key = (
            clean(row.get("business_name", "")).lower(),
            re.sub(r"\D+", "", row.get("phone", "")),
            clean(row.get("existing_website", "")).lower(),
        )
        weak_key = (key[0], key[1] or key[2])
        if weak_key in seen or not key[0]:
            continue
        seen.add(weak_key)
        deduped.append(row)
    return deduped


def main() -> None:
    rows = dedupe(load_existing_enriched() + parse_msp_kl_dental() + parse_londonpages())
    for index, row in enumerate(rows[:1000], start=1):
        row["priority"] = str(index)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows[:1000])
    print(f"wrote={OUT}")
    print(f"rows={min(len(rows), 1000)} total_available={len(rows)}")
    print(f"with_phone={sum(1 for r in rows[:1000] if r.get('phone'))}")
    print(f"with_website={sum(1 for r in rows[:1000] if r.get('existing_website'))}")
    print(f"with_social={sum(1 for r in rows[:1000] if r.get('facebook') or r.get('instagram') or r.get('linkedin') or r.get('x_twitter'))}")


if __name__ == "__main__":
    main()
