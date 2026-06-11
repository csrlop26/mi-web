# 📌 NOTA — Ultra-resumen de la sesión (2026-06-11)

Bot: **PolyEdge** (`crypto-bot/`). Rama: `claude/crypto-bot-models-ynsjxm`.

## v6 — Auditoría completa + resolución infalible (2026-06-11)

Investigación verificada contra docs oficiales de Polymarket 2026:

1. **Fee corregida (POR CONTRATO)**: la fórmula oficial es
   `C × 0.072 × p(1-p)` por contrato, NO sobre el notional. Sobre lo
   gastado equivale a `7.2% × (1-p)`: longshots carísimos (6.5% en
   p=0.10), favoritos casi gratis (0.72% en p=0.90). El executor cobraba
   de menos en compras baratas. (`bot/fees.py`, `bot/execution.py`)
2. **Resolución con triple red**: API oficial (3 min) → cierre real de
   Binance vs strike (kline 1m, a partir de 1 min) → último mid del libro.
   Adiós POLY-NORES y posiciones zombi. Regla oficial: empate gana UP.
3. **Prefetch de la siguiente ventana**: su slug es determinista
   (epoch = end_ts actual) → se descubre 50 s antes de la rotación.
   Sin hueco al abrir, que son los segundos con más edge.
4. **Salida del momentum corregida**: el edge de salida se mide contra el
   bid (lo que pagan por salir), no el ask — antes retenía perdedoras.
5. **Cash check con fee** (+2%), fuga de memoria en engine eliminada,
   `res=N` en status (el dashboard muestra Resueltas), `.gitignore`.
6. **Contexto real 2026** (investigado): el arbitraje de latencia puro
   está muerto (Polymarket quitó el delay de 500 ms en feb-2026 y puso
   la fee dinámica para matarlo). Lo que funciona: market making con
   rebates (20% diario) + compra de favoritos al final de ventana
   (fee ~0). El bot ya hace ambas. Liquidez típica: $5-50k por ventana.
   Rate limits API: holgadísimos para nuestro ritmo (4000 req/10s).

Mejora futura documentada: websocket RTDS de Polymarket
(`wss://ws-subscriptions-clob.polymarket.com/ws/market` + topic
`crypto_prices_chainlink`) — daría el feed de Chainlink (el que resuelve)
en tiempo real en vez de Binance, y libro sin polling.

## v5 — Arreglo del "noche entera sin trades" (2026-06-11)

Tres causas raíz, las tres corregidas (detalle en README → sección v5):

1. **Fee dinámica 2026 mal modelada**: Polymarket cobra
   `0.072 × p(1-p)` (pico 1.8% en p=0.5, ~0 en extremos), no 1.8% plano.
   El bot exigía edge ≥9.6% siempre → nunca entraba. Ahora fee al precio
   real de entrada, una sola vez si se aguanta a resolución. `min_edge`
   0.06→0.04. (`bot/fees.py` nuevo.)
2. **Slugs de descubrimiento inexistentes**: los reales son deterministas
   `btc-updown-5m-{epoch alineado a 300s}`. El feed los calcula y pide
   directo a la Gamma API, sin buscar.
3. **Apertura oficial vía price-to-beat** (el strike de Chainlink que usa
   el oráculo), Binance solo de respaldo. Y la consulta de resolución ya
   no bloquea el bucle de cotizaciones.

Validación sim 3 semillas: 3/3 positivas, winrate 67-74%.
**Siguiente paso: volver a lanzar `start-bot.bat` una noche en paper.**

## Qué se hizo antes (v4 — Opción C)

1. **Doble duración simultánea**: el bot opera ventanas de **5 y 15 min a la
   vez** (BTC+ETH+SOL = 6 mercados en paralelo).
2. **Asignador de régimen** (`bot/allocator.py`): mide la volatilidad real de
   BTC en vivo y reparte el capital — vol alta → 80% del peso a 5 min;
   vol baja → 80% a 15 min; entre medias, lineal.
3. **Tope absoluto por orden** ($250): el compounding no puede crecer por
   encima de lo que los libros de 5 min absorben de verdad.
4. **Capital pequeño (100–300 €)**: config por defecto a 200 €, trades del
   10% del equity, edges netos de la fee real de Polymarket (1.8% taker;
   maker 0% → el market maker no paga comisión).
5. **PnL por duración** en el informe de sesión (`pnl_por_duracion`).
6. Fix previo clave (v3): Polymarket no publica el precio de apertura → el
   bot lo captura solo desde Binance. Era la causa del paper mudo 1 h.

## Validación (sim, 5 semillas, fees reales, 200 €)

5/5 sesiones positivas. Ambas duraciones aportan PnL; la de 5 min domina con
volatilidad. ⚠️ El simulador lleva la ineficiencia incorporada SIEMPRE: sus
cifras validan la mecánica, no son expectativa de retorno real.

## Siguiente paso

```bash
cd crypto-bot
pip install -r requirements.txt
python3 main.py --mode paper     # Fase 2: datos reales, dinero ficticio
```
1–2 semanas de paper → si los números aguantan, Fase 3 con 50–100 €.

## Pendiente

- **Sentinel-Thanos**: este entorno solo tiene acceso a `csrlop26/mi-web`.
  Para llevar el bot allí: clona esta rama y copia la carpeta `crypto-bot/`,
  o añade el repo Sentinel-Thanos al entorno de Claude Code y pídelo.
- Ejecución live (`bot/execution.py`): mapeo final de token_id antes de
  operar con dinero real. Bloqueada a propósito.
