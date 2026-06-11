#!/usr/bin/env python3
"""Sonda profunda de la API de Polymarket — imprime TODO lo que devuelve
cada fuente de descubrimiento. Ejecutar y pegar la salida completa:

    python probe_poly.py
"""
from __future__ import annotations

import asyncio
import json
import re
import time

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36")
PAGE_HEADERS = {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}
GAMMA = "https://gamma-api.polymarket.com"


def show_market(m: dict, prefix: str = "      ") -> None:
    toks = m.get("clobTokenIds")
    n_tok = len(json.loads(toks)) if isinstance(toks, str) and toks else (
        len(toks) if isinstance(toks, list) else 0)
    print(f"{prefix}q='{m.get('question','?')[:60]}'")
    print(f"{prefix}  slug={m.get('slug','?')}")
    print(f"{prefix}  endDate={m.get('endDate') or m.get('endDateIso')}  "
          f"tokens={n_tok}  conditionId={'sí' if m.get('conditionId') else 'NO'}  "
          f"closed={m.get('closed')}  active={m.get('active')}  "
          f"acceptingOrders={m.get('acceptingOrders')}")


async def main():
    import aiohttp
    now = int(time.time())
    print(f"now={now}  UTC={time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(now))}")
    print("=" * 70)

    async with aiohttp.ClientSession(headers={"User-Agent": UA}) as http:

        async def get_json(url, params=None, label=""):
            try:
                async with http.get(url, params=params or {}, timeout=15) as r:
                    body = await r.text()
                    print(f"[{label}] HTTP {r.status}  bytes={len(body)}")
                    if r.status == 200:
                        try:
                            return json.loads(body)
                        except ValueError:
                            print(f"   no es JSON: {body[:200]}")
                    else:
                        print(f"   cuerpo: {body[:200]}")
            except Exception as e:
                print(f"[{label}] EXCEPCIÓN: {e}")
            return None

        # ── 1. slugs deterministas 15m y 5m ──────────────────────────
        print("\n### 1. SLUG DETERMINISTA (gamma /events?slug=) ###")
        for dur in (15, 5):
            period = dur * 60
            aligned = now // period * period
            for ts in (aligned, aligned + period):
                slug = f"btc-updown-{dur}m-{ts}"
                data = await get_json(f"{GAMMA}/events",
                                      {"slug": slug, "limit": "3"},
                                      f"events?slug={slug}")
                for ev in data or []:
                    print(f"   evento: slug={ev.get('slug')} "
                          f"título='{ev.get('title','?')[:50]}' "
                          f"markets={len(ev.get('markets', []))}")
                    for m in ev.get("markets", [])[:2]:
                        show_market(m)

        # ── 2. /markets?slug= directo ────────────────────────────────
        print("\n### 2. GAMMA /markets?slug= (slug actual 15m) ###")
        aligned15 = now // 900 * 900
        slug15 = f"btc-updown-15m-{aligned15}"
        data = await get_json(f"{GAMMA}/markets", {"slug": slug15, "limit": "3"},
                              f"markets?slug={slug15}")
        for m in data or []:
            show_market(m, "   ")

        # ── 3. scraping web /crypto/15M y /crypto/5M ─────────────────
        print("\n### 3. SCRAPING polymarket.com/crypto/{15M,5M} ###")
        for dur in (15, 5):
            url = f"https://polymarket.com/crypto/{dur}M"
            try:
                async with http.get(url, timeout=20, headers=PAGE_HEADERS,
                                    allow_redirects=True) as r:
                    html = await r.text()
                    print(f"[{url}] HTTP {r.status}  bytes={len(html)}  "
                          f"url_final={r.url}")
                    if r.status != 200:
                        print(f"   cuerpo: {html[:300]}")
                        continue
                    slugs = sorted(set(re.findall(
                        rf"[a-z]+-updown-{dur}m-\d+", html)))
                    print(f"   slugs updown-{dur}m encontrados: {len(slugs)}")
                    for s in slugs[:8]:
                        print(f"      {s}")
                    if not slugs:
                        n_upd = html.count("updown")
                        print(f"   'updown' aparece {n_upd} veces en el HTML")
                        i = html.find("updown")
                        if i >= 0:
                            print(f"   contexto: …{html[max(0,i-120):i+180]}…")
                        else:
                            # ¿es un challenge de Cloudflare?
                            low = html[:1500].lower()
                            if "cloudflare" in low or "challenge" in low or "just a moment" in low:
                                print("   ⚠ Parece challenge de Cloudflare (página de verificación)")
                            print(f"   inicio HTML: {html[:300]}")
            except Exception as e:
                print(f"[{url}] EXCEPCIÓN: {e}")

        # ── 4. listado de EVENTOS (no mercados) ──────────────────────
        print("\n### 4. GAMMA /events?closed=false (listado de eventos) ###")
        data = await get_json(f"{GAMMA}/events",
                              {"closed": "false", "order": "endDate",
                               "ascending": "true", "limit": "100"},
                              "events?closed=false")
        hits = []
        for ev in data or []:
            s = (ev.get("slug") or "").lower()
            t = (ev.get("title") or "").lower()
            if "updown" in s or "up or down" in t:
                hits.append(ev)
        print(f"   eventos updown en los primeros 100: {len(hits)}")
        for ev in hits[:6]:
            print(f"   slug={ev.get('slug')}  título='{ev.get('title','?')[:50]}'  "
                  f"endDate={ev.get('endDate')}")
            for m in ev.get("markets", [])[:1]:
                show_market(m)

        # ── 5. listado eventos con tag crypto ────────────────────────
        print("\n### 5. GAMMA /events?tag_slug=crypto ###")
        data = await get_json(f"{GAMMA}/events",
                              {"closed": "false", "tag_slug": "crypto",
                               "order": "endDate", "ascending": "true",
                               "limit": "50"},
                              "events?tag_slug=crypto")
        for ev in (data or [])[:6]:
            print(f"   slug={ev.get('slug')}  título='{ev.get('title','?')[:50]}'  "
                  f"endDate={ev.get('endDate')}")

        # ── 6. búsqueda pública ──────────────────────────────────────
        print("\n### 6. GAMMA /public-search q='btc updown' ###")
        data = await get_json(f"{GAMMA}/public-search",
                              {"q": "btc updown", "limit_per_type": "8"},
                              "public-search")
        if isinstance(data, dict):
            for ev in data.get("events", [])[:8]:
                print(f"   slug={ev.get('slug')}  título='{ev.get('title','?')[:50]}'")

        # ── 7. CLOB sampling-simplified-markets ──────────────────────
        print("\n### 7. CLOB /sampling-simplified-markets (mercados con actividad) ###")
        data = await get_json("https://clob.polymarket.com/sampling-simplified-markets",
                              {}, "clob sampling")
        items = (data or {}).get("data", []) if isinstance(data, dict) else []
        print(f"   mercados devueltos: {len(items)}")

    print("\n" + "=" * 70)
    print("FIN — pega TODA esta salida en el chat")


if __name__ == "__main__":
    asyncio.run(main())
