# 🤖 PolyEdge — Bot de Mercados de Predicción (Polymarket)

Bot automatizado que opera en los mercados de predicción cripto de Polymarket
(mercados "up or down" de BTC/ETH/SOL a 15 minutos) combinando dos estrategias:

| Estrategia | Apodo | Qué hace |
|------------|-------|----------|
| **A — Momentum Lag** | "El rezagado" | Detecta cuando Polymarket va por detrás del precio real de Binance y apuesta en ese hueco de segundos |
| **C — Market Maker** | "El casino" | Pone precios de compra y venta a la vez y cobra la diferencia, gane quien gane |

Ambas estrategias corren a la vez bajo un **gestor de riesgo** que manda sobre todo lo demás.

---

## ⚡ Mejoras v2 (maximizar ganancia diaria)

| # | Mejora | Qué aporta |
|---|--------|------------|
| 1 | **Multi-símbolo** (BTC + ETH + SOL) | 3 mercados = 3× más oportunidades por ventana |
| 2 | **Señal cruzada BTC→alts** | ETH/SOL siguen a BTC con ~2 s de retraso; el bot apuesta en el alt ANTES de que recoja el movimiento de BTC |
| 3 | **Reinversión automática** | El tamaño de cada operación se calcula sobre el equity vivo, no sobre el capital inicial → interés compuesto |
| 4 | **Volatilidad realizada** | El modelo mide la volatilidad real del momento (EWMA tick a tick) en vez de usar un valor fijo → probabilidades más precisas, edges más fiables |
| 5 | **Salida más rápida** | Cierra al evaporarse el hueco (0.01) y rota el capital más veces por ventana |
| 6 | **Spread dinámico (MM)** | Mercado tranquilo → spread estrecho (más volumen); volatilidad alta → spread ancho (más cobro por fill) |
| 7 | **Sesgo de inventario (MM)** | Si acumula un lado, desplaza las cotizaciones para soltar inventario en vez de cargar riesgo |
| 8 | **Retirada final (MM)** | Deja de cotizar en los últimos 60 s de cada ventana, cuando el precio justo se mueve violento |

**Resultados medidos en simulación (mismas semillas, antes → después):**

| Sesión | v1 | v2 |
|--------|-----|-----|
| Semilla 42 (4 ventanas) | +99.7% | **+277.1%** |
| Semilla 7 (6 ventanas) | +133.1% | **+162.2%** |
| Semilla 2026 (mercado hostil) | — | **+3.7%** (kill switch protegió las ganancias) |

> El simulador lleva la ineficiencia incorporada a propósito; en el mercado
> real los retornos serán mucho más modestos. Lo importante de la tercera
> fila: en un mercado malo el sistema de riesgo corta a tiempo y la sesión
> termina en verde en vez de en rojo.

---

## ⚠️ Léeme primero

- El bot arranca **siempre en modo PAPER** (dinero ficticio). Nadie pierde un céntimo hasta que tú lo decidas.
- El modo LIVE requiere tus claves de Polymarket y activarlo a propósito con `--mode live --i-understand-the-risk`.
- Ningún bot garantiza beneficios. Este bot explota ineficiencias documentadas, pero las ineficiencias se cierran con el tiempo. El gestor de riesgo existe para que un mal día no se convierta en una mala semana.

---

## 🗺️ El plan, por fases

```
FASE 1 — SIMULACIÓN (estás aquí)
  python3 main.py --mode sim
  → Mercado sintético que imita el retraso real de Polymarket.
  → Sirve para ver el bot funcionar de punta a punta y ajustar parámetros.

FASE 2 — PAPER TRADING CON DATOS REALES
  python3 main.py --mode paper
  → Precios reales de Binance + mercados reales de Polymarket.
  → Órdenes ficticias. Mide el rendimiento real sin arriesgar nada.
  → Recomendado: mínimo 1-2 semanas antes de pasar a la fase 3.

FASE 3 — DINERO REAL EN PEQUEÑO
  python3 main.py --mode live --i-understand-the-risk
  → Empieza con $50-100. Bankroll configurado en config.json.
  → El gestor de riesgo limita cada apuesta al 5% y corta el día al -5%.

FASE 4 — ESCALAR
  → Sube capital progresivamente solo si las fases 2 y 3 fueron rentables.
  → Añade más mercados (ETH, SOL) en config.json → "symbols".
```

---

## 🧠 Cómo decide el bot (sin tecnicismos)

### Estrategia A — Momentum Lag
1. **MIRAR**: precio de BTC en Binance, tick a tick.
2. **CALCULAR**: con el movimiento reciente y el tiempo que queda de ventana,
   ¿qué probabilidad real hay de que la vela de 15 min cierre en verde?
3. **COMPARAR**: ¿qué probabilidad está cobrando Polymarket ahora mismo?
4. **ACTUAR**: si Polymarket cobra 55¢ por algo que en realidad vale 70¢,
   compra. Si el hueco se cierra, vende. Si no, espera a la resolución.

### Estrategia C — Market Maker
1. Calcula el precio justo del mercado.
2. Pone una orden de compra un poco por debajo y una de venta un poco por encima.
3. Cuando alguien cruza sus órdenes, gana el diferencial (spread).
4. Controla el inventario: nunca acumula demasiado de un solo lado.

### Gestor de riesgo (manda sobre las dos)
- Máximo **5% del bankroll por operación**.
- Pérdida diaria máxima **5%** → el bot se apaga hasta mañana.
- Drawdown máximo **15%** desde el pico → kill switch total.
- Máximo de posiciones abiertas a la vez (configurable).

---

## 📁 Estructura

```
crypto-bot/
├── main.py                  ← punto de entrada
├── config.json              ← TODOS los parámetros ajustables
├── requirements.txt         ← dependencias (solo para modos paper/live)
├── .env.example             ← plantilla de claves para modo live
└── bot/
    ├── engine.py            ← orquestador: conecta feeds, estrategias, riesgo y ejecución
    ├── events.py            ← tipos de datos (ticks, cotizaciones, órdenes, fills)
    ├── config.py            ← carga y validación de config.json
    ├── risk.py              ← gestor de riesgo (límites y kill switch)
    ├── portfolio.py         ← posiciones, PnL, bankroll
    ├── execution.py         ← ejecutores paper y live
    ├── reporting.py         ← consola en vivo + informe de sesión en logs/
    ├── feeds/
    │   ├── sim.py           ← mercado sintético (fase 1, sin internet)
    │   ├── binance.py       ← websocket de precios spot reales
    │   └── polymarket.py    ← mercados up/down reales de Polymarket
    └── strategies/
        ├── momentum_lag.py  ← Estrategia A
        └── market_maker.py  ← Estrategia C
```

---

## 🚀 Arranque rápido

```bash
cd crypto-bot

# Fase 1 — simulación (no necesita instalar nada, solo Python 3.11+)
python3 main.py --mode sim

# Fase 2 — paper con datos reales (requiere dependencias)
pip install -r requirements.txt
python3 main.py --mode paper

# Fase 3 — dinero real (configura .env primero, ver .env.example)
python3 main.py --mode live --i-understand-the-risk
```

Al terminar cada sesión (Ctrl+C) se guarda un informe JSON en `logs/`
con todas las operaciones, el PnL y las métricas de cada estrategia.

---

## 🎛️ Parámetros clave (config.json)

| Parámetro | Qué controla | Valor inicial |
|-----------|--------------|---------------|
| `bankroll` | Capital de trabajo (ficticio en sim/paper) | 1000 |
| `symbols` | Mercados a operar | BTC, ETH, SOL |
| `momentum_lag.min_edge` | Hueco mínimo (en probabilidad) para apostar | 0.06 |
| `momentum_lag.take_profit_edge` | Cierra cuando el hueco se reduce a esto | 0.01 |
| `momentum_lag.cross_beta` | Cuánto del movimiento de BTC esperan recoger los alts | 0.6 |
| `market_maker.base_spread` | Spread base del market maker (se adapta solo) | 0.03 |
| `market_maker.min_spread` / `max_spread` | Límites del spread dinámico | 0.015 / 0.08 |
| `market_maker.max_inventory_usd` | Inventario máximo por lado | 100 |
| `market_maker.inventory_skew` | Fuerza del sesgo para soltar inventario | 0.6 |
| `risk.max_trade_pct` | % máximo del equity por operación (compone) | 0.05 |
| `risk.daily_loss_limit_pct` | Pérdida diaria que apaga el bot | 0.07 |
| `risk.max_drawdown_pct` | Drawdown que activa el kill switch | 0.20 |

Empieza conservador. Sube agresividad solo con datos de las fases 1 y 2 delante.
