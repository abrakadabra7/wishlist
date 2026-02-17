"""Fetch product metadata (title, image, price, currency) from a URL."""
import json
import re
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

# ISO 4217 codes we support in the app (must match frontend CURRENCIES)
SUPPORTED_CURRENCIES = frozenset({"RUB", "USD", "EUR", "TRY", "UZS", "KZT", "GBP", "UAH"})


def _normalize_currency(code: str | None) -> str | None:
    """Return 3-letter uppercase code if supported, else None."""
    if not code or not isinstance(code, str):
        return None
    code = code.strip().upper()
    if len(code) == 3 and code in SUPPORTED_CURRENCIES:
        return code
    # Map common symbols/names to code
    symbol_map = {"₽": "RUB", "$": "USD", "€": "EUR", "£": "GBP", "₺": "TRY", "₴": "UAH", "₸": "KZT"}
    if code in symbol_map:
        return symbol_map[code]
    return None


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
    Fetch URL and extract og:title, og:image, price and currency from JSON-LD or meta.
    Returns {"title": str|None, "image_url": str|None, "price": float|None, "currency": str|None}.
    """
    result = {"title": None, "image_url": None, "price": None, "currency": None}
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

    # Meta price fallback (e.g. product:price:amount, product:price:currency)
    if result["price"] is None or result["currency"] is None:
        meta_amount = None
        meta_currency = None
        for name in ("product:price:amount", "product:price:currency", "price"):
            tag = soup.find("meta", property=name) or soup.find("meta", attrs={"name": name})
            if tag and tag.get("content"):
                content = tag["content"].strip()
                if name == "product:price:currency":
                    meta_currency = _normalize_currency(content)
                else:
                    p = _extract_price_from_string(content)
                    if p is not None:
                        meta_amount = p
        if meta_amount is not None and result["price"] is None:
            result["price"] = meta_amount
        if meta_currency is not None:
            result["currency"] = meta_currency

    # Fallback: infer currency from URL domain when we have price but no currency
    if result["price"] is not None and result["currency"] is None:
        try:
            host = (urlparse(base_url).netloc or "").lower()
            if host.endswith(".ru") or host.endswith(".рф"):
                result["currency"] = "RUB"
            elif host.endswith(".ua"):
                result["currency"] = "UAH"
            elif host.endswith(".uz"):
                result["currency"] = "UZS"
            elif host.endswith(".kz"):
                result["currency"] = "KZT"
            elif host.endswith(".tr"):
                result["currency"] = "TRY"
            elif host.endswith(".uk"):
                result["currency"] = "GBP"
        except Exception:
            pass

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
                if isinstance(offers, dict):
                    if "price" in offers:
                        try:
                            result["price"] = float(offers["price"])
                        except (TypeError, ValueError):
                            pass
                    if "priceCurrency" in offers and result["currency"] is None:
                        result["currency"] = _normalize_currency(offers.get("priceCurrency"))
                elif isinstance(offers, list) and offers and isinstance(offers[0], dict):
                    o = offers[0]
                    if "price" in o:
                        try:
                            result["price"] = float(o["price"])
                        except (TypeError, ValueError):
                            pass
                    if "priceCurrency" in o and result["currency"] is None:
                        result["currency"] = _normalize_currency(o.get("priceCurrency"))
            if "price" in obj and result["price"] is None:
                try:
                    result["price"] = float(obj["price"])
                except (TypeError, ValueError):
                    pass
            if "priceCurrency" in obj and result["currency"] is None:
                result["currency"] = _normalize_currency(obj.get("priceCurrency"))
    for v in obj.values():
        if isinstance(v, dict):
            _apply_ld_price(v, result, base_url)
        elif isinstance(v, list):
            for item in v:
                if isinstance(item, dict):
                    _apply_ld_price(item, result, base_url)
