#!/usr/bin/env python3
"""
PolyEdge — diagnóstico rápido de conectividad (sin arrancar el bot).
Ejecutar: python3 diagnose.py

Comprueba paso a paso:
  1. Internet (DNS)
  2. Binance WebSocket (primer tick de BTC)
  3. Polymarket Gamma API (busca mercado BTC/15m)
  4. Polymarket CLOB API (libro del mercado encontrado)
  5. Price-to-beat del mercado encontrado
"""
from __future__ import annotations

import asyncio
import json
import sys
import time

OK  = "  [OK] "
ERR = "  [FAIL] "
INF = "  [..] "

async def check_binance() -> bool:
    print(INF + "Binance WebSocket — conectando a wss://stream.binance.com:9443 ...")
    try:
        import websockets
        url = "wss://stream.binance.com:9443/stream?streams=btcusdt@trade"
        async with websockets.connect(url, open_timeout=10) as ws:
            raw = await asyncio.wait_for(ws.recv(), timeout=10)
            msg = json.loads(raw)
            price = float(msg["data"]["p"])
            print(OK + f"Binance conectado. BTC = ${price:,.2f}")
            return True
    except Exception as e:
        print(ERR + f"Binance falló: {e}")
        return False

async def check_polymarket() -> bool:
    print()
    print(INF + "Polymarket Gamma API — buscando mercados BTC up/down ...")
    try:
        import aiohttp
    except ImportError:
        print(ERR + "aiohttp no instalado. Ejecuta: pip install -r requirements.txt")
        return False

    gamma = "https://gamma-api.polymarket.com"
    clob  = "https://clob.polymarket.com"
    headers = {"User-Agent": "Mozilla/5.0 (polyedge-bot/2.0)"}

    async with aiohttp.ClientSession(headers=headers) as http:
        # 1) slug determinista
        found_market = None
        for dur in (15, 5):
            period  = dur * 60
            aligned = int(time.time() // period) * period
            for ts in (aligned, aligned - period, aligned + period):
                slug = f"btc-updown-{dur}m-{ts}"
                url  = f"{gamma}/events?slug={slug}&limit=5"
                async with http.get(url, timeout=12) as r:
                    if r.status != 200:
                        print(f"  {INF}  slug {slug} → HTTP {r.status}")
                        continue
                    data = await r.json(content_type=None)
                    if data:
                        for ev in data:
                            mkts = ev.get("markets", [])
                            if mkts:
                                found_market = mkts[0]
                                found_market["_slug"] = slug
                                print(OK + f"Gamma API: mercado encontrado vía slug {slug}")
                                print(f"       pregunta: {found_market.get('question','?')}")
                                break
                    if found_market:
                        break
            if found_market:
                break

        if not found_market:
            # Fallback: listado general
            print(INF + "Slug determinista sin resultado — probando listado general...")
            url = f"{gamma}/markets?closed=false&order=endDate&ascending=true&limit=50"
            async with http.get(url, timeout=12) as r:
                if r.status == 200:
                    data = await r.json(content_type=None)
                    for m in data or []:
                        q = (m.get("question") or "").lower()
                        if "bitcoin" in q and "up or down" in q:
                            found_market = m
                            print(OK + f"Listado: '{m.get('question','?')}'")
                            break
                else:
                    print(ERR + f"Listado general HTTP {r.status}")

        if not found_market:
            print(ERR + "No se encontró ningún mercado BTC en Polymarket.")
            print("       Posibles causas:")
            print("       · La API devuelve 403 (bloqueo geográfico o de IP)")
            print("       · Los mercados están pausados (fin de semana/mantenimiento)")
            print("       · El slug ha cambiado de formato")
            return False

        # 2) CLOB book
        token_ids = found_market.get("clobTokenIds")
        if token_ids:
            tokens = json.loads(token_ids) if isinstance(token_ids, str) else token_ids
            if tokens:
                print()
                print(INF + f"CLOB libro — token {tokens[0][:20]}...")
                url = f"{clob}/book?token_id={tokens[0]}"
                async with http.get(url, timeout=12) as r:
                    if r.status == 200:
                        book = await r.json(content_type=None)
                        bids = book.get("bids", [])
                        asks = book.get("asks", [])
                        if bids and asks:
                            bb = max(float(b["price"]) for b in bids)
                            ba = min(float(a["price"]) for a in asks)
                            print(OK + f"CLOB OK → bid={bb:.3f}  ask={ba:.3f}  spread={ba-bb:.3f}")
                        else:
                            print(ERR + f"CLOB vacío (bids={len(bids)} asks={len(asks)})")
                    else:
                        print(ERR + f"CLOB HTTP {r.status}")

        # 3) price-to-beat
        slug_m = found_market.get("_slug") or found_market.get("slug")
        if slug_m:
            print()
            print(INF + f"Price-to-beat — slug {slug_m}...")
            for tmpl in (
                f"https://polymarket.com/api/crypto/price-to-beat?slug={slug_m}",
                f"https://polymarket.com/api/equity/price-to-beat/{slug_m}",
            ):
                async with http.get(tmpl, timeout=12) as r:
                    if r.status == 200:
                        d = await r.json(content_type=None)
                        print(OK + f"Price-to-beat: {d}")
                        break
                    else:
                        print(f"  {INF}  {tmpl.split('polymarket.com')[-1]} → HTTP {r.status}")
        return True


async def main():
    print("=" * 55)
    print("  PolyEdge — Diagnóstico de conectividad")
    print("=" * 55)
    b_ok = await check_binance()
    p_ok = await check_polymarket()
    print()
    print("=" * 55)
    status = ("TODO OK ✓" if b_ok and p_ok
              else "HAY PROBLEMAS — revisa los mensajes arriba")
    print(f"  RESULTADO: {status}")
    print("=" * 55)
    if not p_ok:
        print()
        print("  Si Gamma API da 403 siempre, prueba con VPN o")
        print("  verifica que polymarket.com sea accesible desde")
        print("  tu navegador.")


if __name__ == "__main__":
    asyncio.run(main())
