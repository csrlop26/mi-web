# 🤖 PolyEdge — Bot de Mercados de Predicción (Polymarket)

Bot automatizado que opera en los mercados de predicción cripto de Polymarket
(mercados "up or down" de BTC/ETH/SOL a **5 y 15 minutos simultáneos**)
combinando dos estrategias:

| Estrategia | Apodo | Qué hace |
|------------|-------|----------|
| **A — Momentum Lag** | "El rezagado" | Detecta cuando Polymarket va por detrás del precio real de Binance y apuesta en ese hueco de segundos |
| **C — Market Maker** | "El casino" | Pone precios de compra y venta a la vez y cobra la diferencia, gane quien gane |

Ambas estrategias corren a la vez bajo un **gestor de riesgo** que manda sobre todo lo demás.

---

## 🔀 v4 — Opción C: doble duración con asignador de régimen

El bot opera las ventanas de **5 min y 15 min A LA VEZ** y reparte el capital
según la volatilidad realizada de BTC (medida en vivo, EWMA tick a tick):

```
vol ALTA  (≥ 0.85 anualizada) → 80% del peso a 5 min   (el lag pesa más)
vol BAJA  (≤ 0.45 anualizada) → 80% del peso a 15 min  (más señal estable)
entre medias                  → interpolación lineal
```

Por qué: el retraso de Polymarket es siempre ~5 s. Con volatilidad alta esos
5 s mueven mucho precio → el edge en la ventana corta es enorme. Con mercado
tranquilo ese mismo lag apenas crea hueco y la ventana larga rinde más.

- El peso se aplica como multiplicador de tamaño por operación (la duración
  favorecida opera a 1×, la otra baja hasta 0.4×).
- `config.json → durations_minutes: [5, 15]` y bloque `allocator`.
- El informe de sesión desglosa el PnL por duración (`pnl_por_duracion`).
- Benchmark previo (sólo una duración, mismas semillas): 5 min media +4542%,
  15 min media +556% — pero 5 min con varianza brutal (+59% a +9231%).
  La Opción C captura lo mejor de ambos sin apostarlo todo a uno.
- **Tope absoluto por orden** (`risk.max_trade_usd`, $250): el % sobre equity
  compone, pero los libros de 5 min no absorben órdenes de miles de dólares.
  El tope mantiene los tamaños dentro de la liquidez real de Polymarket
  (también frena los resultados de fantasía del simulador).

**Validación v4 (bankroll 200 €, fees reales 1.8%, 5 semillas, 2.5 h de
mercado simulado):** 5/5 positivas; el PnL por duración confirma que ambas
ventanas aportan y que la de 5 min domina cuando hay volatilidad. Cifras del
simulador = mecánica validada, NO expectativa real: el sim lleva el lag
incorporado siempre; el mercado real lo ofrece a ratos. La expectativa real
la dirá la Fase 2 (paper).

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

## 💶 v3 — Adaptado a capital pequeño (100–300 €)

Con poco capital el enemigo número uno son las **comisiones**: Polymarket
cobra ~1.8% (taker) en mercados cripto. Un trade de 5 € paga 0.09 € de fee
por cruzar — un edge pequeño se evapora entero. La v3 ataca eso de frente:

| Cambio | Por qué |
|--------|---------|
| **Edges netos de comisiones** | El bot solo entra si el hueco supera `min_edge` + 2× la fee. Un edge que no paga las comisiones no es un edge. |
| **Mantener hasta resolución** | Cobrar el contrato al resolver la ventana NO paga fee; vender antes sí. El bot ahora solo vende antes si el mercado pasa a sobrevalorar su lado más de lo que cuesta la comisión. |
| **Market maker 100% maker** | Las órdenes pasivas no pagan taker fee (0%). Con capital pequeño, el MM es la pata más eficiente en costes. |
| **Apuestas del 10% (antes 5%)** | Con 200 € son trades de ~20 €: la fee fija porcentual deja de comerse la oportunidad. Menos posiciones simultáneas, más selectivas. |
| **Límites de riesgo a escala** | Pérdida diaria 10%, kill switch al 25%: a esta escala una mala racha normal de 4-5 trades no debe apagar el bot. |

**Capital y expectativas honestas:**

| Capital | Veredicto |
|---------|-----------|
| 100 € | Operable, pero la fee pesa: solo entrarán los huecos grandes |
| 200 € | Punto de partida razonable (config por defecto) |
| 300 € | Margen cómodo; el compounding empieza a notarse |

---

## 🚨 v5 — Por qué el bot estuvo una noche entera sin operar (y el arreglo)

Investigación con información actualizada de 2026. Tres causas, las tres corregidas:

**1. La fee estaba mal modelada → el umbral de entrada era inalcanzable.**
En marzo de 2026 Polymarket cambió a una **taker fee dinámica** en los
mercados cripto de 5/15 min (introducida explícitamente para frenar el
arbitraje de latencia — nuestra Estrategia A):

```
fee = notional × 0.072 × p×(1−p)      (p = precio del contrato)

p = 0.50 → 1.80%  (pico)        p = 0.90 → 0.65%
p = 0.70 → 1.51%                p = 0.95 → 0.34%
```

El bot asumía 1.8% plano y exigía edge ≥ `min_edge + 2×1.8% = 9.6%` SIEMPRE.
Ese hueco casi nunca existe → cero entradas en toda la noche.
Ahora la fee se calcula al precio real de entrada de cada lado y solo se
cuenta UNA vez si se aguanta a resolución (cobrar el contrato no paga fee).
Entrar en los extremos (p≈0.9) cuesta casi nada → muchas más oportunidades.

**2. Los slugs de descubrimiento no existían.**
Los mercados reales viven en eventos con slug **determinista**:
`btc-updown-5m-{epoch}` / `btc-updown-15m-{epoch}` donde epoch = inicio de
la ventana alineado a 300/900 s UTC (ej. real: `btc-updown-15m-1768502700`).
El feed ahora CALCULA el slug de la ventana vigente y la pide directa a
`/events?slug=` — sin búsqueda, sin depender de listados. Las rutas
antiguas quedan de respaldo. (XRP también soportado: `xrp-updown-…`.)

**3. La apertura se estimaba con Binance, pero la resolución es Chainlink.**
Polymarket SÍ publica el strike oficial ("price to beat") vía
`polymarket.com/api/crypto/price-to-beat?slug={slug}`. El feed lo adjunta a
cada cotización; la captura desde Binance queda solo como último recurso.

Además: la consulta de resolución ya no bloquea el bucle (antes un sleep de
5 s por ventana retrasaba el descubrimiento y se perdía el arranque fresco
de las ventanas de 5 min), y `min_edge` baja de 0.06 a 0.04 porque ahora la
fee se paga con precisión en vez de con un colchón gigante.

**Validación v5 (sim, 3 semillas):** 3/3 positivas, winrate 67–74%.

---

## 🔧 Registro de bugs (encontrados en paper trading real)

**Bug #1 — El bot estuvo 1 h en paper sin operar (corregido en v3).**
Causa: la Gamma API de Polymarket no publica el precio de apertura de la
ventana; el código lo esperaba y al recibir 0 el modelo de probabilidad
devolvía `None` → ambas estrategias quedaban mudas para siempre.
Arreglo: el bot ahora captura la apertura por sí mismo (el primer precio de
Binance al inicio de cada ventana). Si descubre una ventana ya empezada, la
salta y opera desde la siguiente (cada 15 min hay otra). Además el
descubrimiento de mercados prueba 3 rutas de la API y cada 60 s se imprime
un diagnóstico por símbolo (modelo vs mercado y edge) para ver en vivo por
qué se opera o no.

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
| `durations_minutes` | Ventanas operadas en paralelo | 5 y 15 |
| `allocator.vol_low/vol_high` | Umbrales del régimen de volatilidad | 0.45 / 0.85 |
| `risk.max_trade_pct` | % máximo del equity por operación (compone) | 0.10 |
| `risk.max_trade_usd` | Tope absoluto por orden (liquidez del libro) | 250 |
| `risk.daily_loss_limit_pct` | Pérdida diaria que apaga el bot | 0.10 |
| `risk.max_drawdown_pct` | Drawdown que activa el kill switch | 0.25 |

Empieza conservador. Sube agresividad solo con datos de las fases 1 y 2 delante.
