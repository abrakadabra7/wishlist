"""Fetch product metadata (title, image, price) from a URL."""
import json
import re
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup


USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def _extract_price_from_string(s: str) -> float | None:
    """Try to get first number that looks like a price (with optional decimals)."""
    if not s or not isinstance(s, str):
        return None
    # Match numbers like 1234.56 or 1 234,56 or 1,234.56
    s = s.replace(",", "").replace("\u00a0", " ")
    match = re.search(r"\d+\.?\d*", s)
    if match:
        try:
            return float(match.group())
        except ValueError:
            pass
    return None


async def fetch_link_metadata(url: str) -> dict:
    """
    Fetch URL and extract og:title, og:image, and price from JSON-LD or meta.
    Returns {"title": str|None, "image_url": str|None, "price": float|None}.
    """
    result = {"title": None, "image_url": None, "price": None}
    if not url or not url.strip().startswith(("http://", "https://")):
        return result
    url = url.strip()
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=15.0,
            headers={"User-Agent": USER_AGENT},
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text
            base_url = str(resp.url)
    except Exception:
        return result

    soup = BeautifulSoup(html, "html.parser")

    # Open Graph
    for prop, key in (("og:title", "title"), ("og:image", "image_url")):
        tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
        if tag and tag.get("content"):
            value = tag["content"].strip()
            if key == "image_url" and value and not value.startswith("http"):
                value = urljoin(base_url, value)
            result[key] = value or None

    # Twitter fallback
    if not result["title"]:
        tag = soup.find("meta", attrs={"name": "twitter:title"})
        if tag and tag.get("content"):
            result["title"] = tag["content"].strip()

    if not result["image_url"]:
        tag = soup.find("meta", attrs={"name": "twitter:image"})
        if tag and tag.get("content"):
            result["image_url"] = urljoin(base_url, tag["content"].strip())

    # Price: JSON-LD Product / Offer
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "{}")
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        _apply_ld_price(item, result, base_url)
                        if result["price"] is not None:
                            break
            elif isinstance(data, dict):
                _apply_ld_price(data, result, base_url)
            if result["price"] is not None:
                break
        except (json.JSONDecodeError, TypeError):
            continue

    # Meta price fallback (e.g. product:price:amount)
    if result["price"] is None:
        for name in ("product:price:amount", "product:price:currency", "price"):
            tag = soup.find("meta", property=name) or soup.find("meta", attrs={"name": name})
            if tag and tag.get("content"):
                p = _extract_price_from_string(tag["content"])
                if p is not None:
                    result["price"] = p
                    break

    return result


def _apply_ld_price(obj: dict, result: dict, base_url: str) -> None:
    """Extract price and optionally image from JSON-LD object."""
    if "@type" in obj:
        t = obj.get("@type", "")
        if isinstance(t, list):
            types = t
        else:
            types = [t] if t else []
        if "Product" in types or "Offer" in types:
            if "image" in obj:
                img = obj["image"]
                if isinstance(img, str) and img:
                    result["image_url"] = result["image_url"] or (img if img.startswith("http") else urljoin(base_url, img))
                elif isinstance(img, list) and img and isinstance(img[0], str):
                    result["image_url"] = result["image_url"] or (img[0] if img[0].startswith("http") else urljoin(base_url, img[0]))
            if "offers" in obj:
                offers = obj["offers"]
                if isinstance(offers, dict) and "price" in offers:
                    try:
                        result["price"] = float(offers["price"])
                    except (TypeError, ValueError):
                        pass
                elif isinstance(offers, list) and offers and isinstance(offers[0], dict) and "price" in offers[0]:
                    try:
                        result["price"] = float(offers[0]["price"])
                    except (TypeError, ValueError):
                        pass
            if "price" in obj and result["price"] is None:
                try:
                    result["price"] = float(obj["price"])
                except (TypeError, ValueError):
                    pass
    for v in obj.values():
        if isinstance(v, dict):
            _apply_ld_price(v, result, base_url)
        elif isinstance(v, list):
            for item in v:
                if isinstance(item, dict):
                    _apply_ld_price(item, result, base_url)
