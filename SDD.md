# SDD — Dashboard Ejecutivo PALVI

> **Software Design Document + Documentación Viva**
> Proyecto: reporte ejecutivo B2B SaaS sobre `metrics.json`.
> Stack: React + TypeScript + Vite.
> Audiencia primaria: Jefe de Ventas — 5 minutos en la mañana, antes de la primera reunión.
> **Modo de ejecución: local únicamente** (V1 no se despliega en la nube).
> Estado: v0.3 — pre-implementación. Última actualización: 2026-05-08.

---

## Índice

1. [Contexto y objetivos](#1-contexto-y-objetivos)
2. [Producto: qué construimos y para quién](#2-producto-qué-construimos-y-para-quién)
3. [Requerimientos](#3-requerimientos)
4. [Arquitectura técnica](#4-arquitectura-técnica)
5. [Modelo de datos y reglas de cálculo](#5-modelo-de-datos-y-reglas-de-cálculo)
6. [Especificación funcional](#6-especificación-funcional)
7. [UX e Information Architecture](#7-ux-e-information-architecture)
8. [Sistema de diseño](#8-sistema-de-diseño)
9. [Performance y eficiencia](#9-performance-y-eficiencia)
10. [Seguridad](#10-seguridad)
11. [Decisiones técnicas (ADR ligero)](#11-decisiones-técnicas-adr-ligero)
12. [Plan de implementación](#12-plan-de-implementación)
13. [Roadmap V2](#13-roadmap-v2)
14. [Glosario](#14-glosario)
15. [Bitácora viva](#15-bitácora-viva)
16. [Decisiones de desarrollo (log vivo)](#16-decisiones-de-desarrollo-log-vivo)

---

## 1. Contexto y objetivos

### 1.1 Problema
`metrics.json` contiene métricas diarias de una empresa B2B SaaS (tráfico, leads, deals, tiempos de respuesta, soporte) durante 365 días, repartidas en **4 datasets (A, B, C, D)** con la **misma estructura pero comportamientos distintos**. Hay que construir una **app web que sirva como reporte ejecutivo** y que **responda correctamente a los 4 datasets**, no solo al primero.

### 1.2 Usuario y job-to-be-done
- **Usuario:** Jefe de Ventas.
- **Contexto de uso:** primera ventana de 5 minutos del día.
- **Trabajo a realizar:** decidir **dónde poner foco hoy** para aumentar ventas y mejorar atención al cliente.
- **Salida esperada de la sesión:** 1-3 acciones concretas para el día.

### 1.3 Principios de diseño
1. **Conclusión antes que dato.** Los insights se leen primero; las cifras los respaldan.
2. **Mobile-first.** Diseñado para una mano y un pulgar; desktop es ampliación, no canon.
3. **Cero distractores.** Whitespace > densidad. Color con intención. Animaciones &lt;250 ms.
4. **Respuesta a los 4 datasets.** Las alertas son relativas a baseline propio, no a umbrales fijos.
5. **Precisión sobre vistosidad.** Los cálculos son verificables y auditables.
6. **Aptitud ganadora.** Tono elegante, sobrio, premium — un dashboard que el Jefe quiera abrir.

### 1.4 Criterios de éxito
- El usuario identifica los 3 focos del día en &lt;30 segundos.
- Los 4 datasets generan lecturas accionables coherentes (no solo el A).
- Lighthouse mobile &gt;90 (Performance, Accessibility, Best Practices) **medido en `vite preview` localhost** (sin red real, esto es un proxy de calidad de bundle, no un SLA).
- Bundle inicial &lt;150 KB gz; FCP &lt;1.0 s en localhost emulando 4G slow throttling.
- Setup verificable: clone → `npm install` → `npm run dev` debe funcionar en &lt;2 min en una máquina limpia con Node 20 LTS.

---

## 2. Producto: qué construimos y para quién

Una **single page application** ejecutiva que carga 1 vez al día, deja al usuario navegar entre datasets A/B/C/D, y muestra:

1. **Insight feed** (top 3) — qué requiere atención hoy.
2. **KPI grid hero** — los 6 números que importan + sparklines.
3. **Funnel** — dónde se atasca el negocio.
4. **Customer health** — tickets/resolution con riesgo comercial implícito.
5. **Drill-down por métrica** — bottom sheet con la serie 90d.

No construimos: editor de dashboards, multi-usuario, RBAC, integraciones, exportación a PDF, pickers de fecha custom, comparador multi-dataset side-by-side (V2).

---

## 3. Requerimientos

### 3.1 Funcionales (must)
- **F1.** Cargar y validar `metrics.json` con los 4 datasets.
- **F2.** Selector de dataset A/B/C/D persistente en URL (`?ds=A`) y `localStorage`.
- **F3.** Selector de ventana temporal: 7d / **30d (default)** / 90d / MTD / QTD / 365d.
- **F4.** 6 KPI cards hero con valor + delta % vs período anterior + sparkline 30d + color direction-aware.
- **F5.** Insight feed con hasta 3 alertas, ordenadas por severidad, generadas con reglas deterministas relativas al baseline propio.
- **F6.** Funnel de 5 pasos (`traffic → leads_created → leads_qualified → deals_created → deals_won`) con tasas de conversión y resaltado del cuello de botella.
- **F7.** Drill-down por KPI: bottom sheet (mobile) / panel lateral (desktop) con chart 90d, mejor/peor día, promedio.
- **F8.** Soporte completo de nulls (rotura visual en charts, `—` en valores, exclusión correcta en agregaciones).
- **F9.** Modo claro y oscuro con detección de `prefers-color-scheme` y toggle manual.
- **F10.** Accesible WCAG AA, navegable por teclado, `aria-label` en todos los KPIs.

### 3.2 No funcionales
- **NF1.** Performance: FCP &lt;1.0 s, LCP &lt;1.8 s, TTI &lt;2.5 s, INP &lt;200 ms, CLS &lt;0.05 (4G mobile).
- **NF2.** Bundle inicial &lt;150 KB gz; charting cargado de forma diferida.
- **NF3.** Soporte navegadores: últimas 2 versiones de Chrome/Edge/Firefox/Safari, iOS Safari 16+, Chrome Android 110+.
- **NF4.** Sin backend en V1.
- **NF5.** **Ejecución local únicamente.** El entregable se corre con `npm install && npm run dev` (o `npm run build && npm run preview`). No hay despliegue en la nube en V1; todo lo relativo a hosting, headers HTTP, dominios y CDN queda fuera de alcance hasta V2.
- **NF6.** El bundle de producción debe poder servirse desde un servidor estático local (`vite preview`, `npx serve dist/`, o `python -m http.server`) sin pasos adicionales.

### 3.3 Fuera de alcance V1
Auth, multi-tenant, edición de umbrales de alerta, comparador multi-dataset, anotaciones, exportación, notificaciones push, integraciones CRM.

---

## 4. Arquitectura técnica

### 4.1 Stack final

| Capa | Elección | Razón |
|---|---|---|
| Build | **Vite 5 + SWC** | HMR &lt;50 ms, build con Rollup, salida estática, tree-shaking agresivo. |
| Lenguaje | **TypeScript strict** | Contratos de datos firmes; el dataset tiene estructura repetida. |
| UI | **React 18** | Concurrent features (Suspense), ecosistema. |
| Estilos | **Tailwind CSS + tokens CSS vars** | Velocidad de iteración; tokens permiten dark mode sin duplicar clases. |
| State | **Zustand** | 3 KB, selectores granulares, sin boilerplate. Context provoca re-render en cascada al cambiar dataset. |
| Charts | **Recharts** (V1) → uPlot si métricas mobile lo exigen | DX excelente para series temporales chicas; canvas (uPlot) si Lighthouse cae. |
| Routing | **No router en V1** — single page con anchors y query params | El producto es una página. |
| Iconos | **Lucide React**, stroke 1.5 | Coherencia visual con Linear/Vercel. |
| Tipografía | **Geist Sans + Geist Mono** (self-hosted) | Tabular numerals en cifras. |
| Tests | **Vitest** + **Testing Library** | Mismo runner que Vite; jsdom rápido. |
| Lint/Format | **ESLint** + **Prettier** + `eslint-plugin-react-hooks` + `react/no-danger` rule | Invariantes de seguridad y consistencia. |
| CI | **GitHub Actions**: typecheck, lint, test, build, lighthouse-ci | Bloquea regresiones. |

### 4.2 Estructura de carpetas

```
src/
  app/                  # bootstrap, providers, layout
  components/
    kpi/                # KPICard, KPIGrid, Sparkline
    funnel/             # FunnelView, FunnelStep
    insights/           # InsightCard, InsightFeed
    chart/              # MetricChart, sheet/panel
    ui/                 # primitives (Card, Badge, SegmentedControl, Modal)
  data/
    schema.ts           # tipos canónicos
    load.ts             # carga + validación
    transform.ts        # typed-array indexing, máscaras de null
    aggregations.ts     # sum/weightedAvg/winRate/funnelRates
    insights.ts         # reglas de alertas
  hooks/
  store/                # zustand: dataset, window, theme, dismissed insights
  styles/
    tokens.css          # design tokens (color, spacing, typography)
    globals.css
  utils/
public/
  favicon.svg
  fonts/                # geist
metrics.json            # bundlado en build (no en /public)
```

### 4.3 Flujo de datos

```
metrics.json (build asset, imported as ESM)
   │
   ▼
load.ts ── validate (zod o type-narrowing) ──► RawDataset
   │
   ▼
transform.ts ── per dataset, once ──►
   { metricKey: { values: Float64Array(365), mask: Uint8Array(365), dates: string[] } }
   │
   ▼
aggregations.ts ── per (dataset, window) ──► derived KPIs, funnel rates, win rate
   │
   ▼
insights.ts ── reglas vs baseline 30d ──► top 3 insights ordenados
   │
   ▼
React tree (Zustand selectors) ── KPI grid, Funnel, Insight feed, Drill-down
```

### 4.4 Diagrama de componentes (alto nivel)

```
<App>
 ├─ <Header>            sticky: brand · DatasetSwitcher · WindowSelector · ThemeToggle
 ├─ <InsightFeed>       hasta 3 cards
 ├─ <KPIGrid>           6 KPICards (mobile 2x3, desktop 3x2)
 ├─ <FunnelView>        5 pasos + tasas
 ├─ <SecondarySection>  tickets, deal cycle, traffic
 └─ <DetailSheet>       bottom sheet / side panel (portal)
```

---

## 5. Modelo de datos y reglas de cálculo

### 5.1 Tipos canónicos (TypeScript)

```ts
type Direction = "higher_is_better" | "lower_is_better";
type MetricKey =
  | "traffic" | "leads_created" | "leads_qualified"
  | "deals_created" | "deals_won" | "deals_lost"
  | "avg_response_time_min" | "avg_deal_cycle_days"
  | "stale_deals" | "support_tickets_opened" | "support_avg_resolution_hours";

interface MetricMeta {
  key: MetricKey;
  label: string;
  unit: string;
  direction: Direction;
  description: string;
}

interface DayRecord {
  date: string;            // ISO yyyy-mm-dd
  metrics: Record<MetricKey, number | null>;
}

interface Dataset {
  metadata: { start_date: string; end_date: string; days: number; metrics: MetricMeta[] };
  days: DayRecord[];
}

type DatasetId = "A" | "B" | "C" | "D";
type Metrics = Record<DatasetId, Dataset>;
```

### 5.2 Tabla maestra: tipo, agregación, presentación

| Métrica | Tipo | Direction | Agregación válida | Ventana default | Formato | Nulls |
|---|---|---|---|---|---|---|
| `traffic` | count | higher | **suma** | 7d | entero, separador miles | raros |
| `leads_created` | count | higher | **suma** | 7d | entero | raros |
| `leads_qualified` | count | higher | **suma** | 7d | entero | raros |
| `deals_created` | count | higher | **suma** | 7d | entero | raros |
| `deals_won` | count | higher | **suma** | 7d / 28d | entero | raros |
| `deals_lost` | count | lower | **suma** | 7d / 28d | entero | raros |
| `avg_response_time_min` | rate (promedio diario) | lower | **promedio ponderado por `leads_created`** | 7d | `34.9 min` | sí — días con 0 leads |
| `avg_deal_cycle_days` | rate | lower | **promedio ponderado por `deals_won + deals_lost`** | 28d | `21.4 días` | sí — días sin cierres |
| `stale_deals` | snapshot (EOD) | lower | **último valor**; comparar puntos, **NUNCA sumar** | hoy + delta vs 7d atrás | entero | no |
| `support_tickets_opened` | count | lower | **suma** | 7d | entero | raros |
| `support_avg_resolution_hours` | rate | lower | **promedio ponderado por `support_tickets_opened`** | 7d | `5.2 h` | sí — días con 0 tickets |

### 5.3 Win rate (métrica de período, no media de ratios)

```
win_rate(window) = sum(deals_won) / sum(deals_won + deals_lost)
```
Si `sum(won + lost) == 0` → `undefined`, mostrar `—` con tooltip "sin deals cerrados en la ventana". Default: **28d** (7d es ruidoso para B2B).

### 5.4 Tasas del funnel (período, no cohorte)

```
lead_rate    = sum(leads_created)   / sum(traffic)
qualify_rate = sum(leads_qualified) / sum(leads_created)
deal_rate    = sum(deals_created)   / sum(leads_qualified)
close_rate   = sum(deals_won)       / sum(deals_created)
```
Ventana default funnel: **28d**. Documentar en tooltip: "snapshot del período, no cohorte real" (los deals abiertos en X no necesariamente cerraron en la ventana).

### 5.5 Manejo de nulls
- **Promedios ponderados:** si peso = 0 o métrica = `null`, **excluir del numerador y denominador**. Nunca `null → 0`.
- **Sumas de counts:** preferible excluir días null y exponer cobertura.
- **UI:** badge `n/N días con dato` cuando `N < window`.
- **Charts:** la línea se rompe (gap) en null; el tooltip dice "sin registro".

### 5.6 Comparaciones temporales
- `last_7d`: días `[hoy-7, hoy-1]` (excluir hoy si parcial).
- `prior_7d`: `[hoy-14, hoy-8]`.
- `MTD vs prior MTD-equivalente`: mismos N días del mes anterior, no mes completo.
- `prior == 0 && current > 0` → mostrar `nuevo`, no `+∞`.
- Ambos 0 → delta = 0, neutral.

### 5.7 Outliers
Regla: `|x − mediana_28d| > 3 · MAD` → marcar visualmente, **no excluir** del total (afectaría la verdad), pero excluir de líneas de tendencia suavizadas.

### 5.8 Tendencias: rolling vs raw
- **Raw daily** → detección de eventos (picos/caídas).
- **Rolling 7d** → KPI principal (suaviza día de semana).
- **Rolling 28d** → tendencia de fondo, comparación trimestral.
- Win rate y funnel rates: **siempre rolling 28d sobre sumas**, nunca media móvil de ratios.

### 5.9 Direction-aware deltas

```ts
const isGood =
  (deltaPct > 0 && direction === "higher_is_better") ||
  (deltaPct < 0 && direction === "lower_is_better");
const color = Math.abs(deltaPct) < 0.01 ? "neutral" : isGood ? "positive" : "negative";
```
Aplicar también a tasas derivadas. `response_time` bajando → verde. `stale_deals` subiendo → rojo.

### 5.10 Análisis exploratorio de los 4 datasets (verificado sobre `metrics.json`)

> Tamaño real: **668 KB** sin compresión, 365 días × 11 métricas × 4 datasets. **Cero nulls** en los 4 datasets actuales — el manejo de nulls se mantiene como contrato defensivo (la spec lo exige y es parte del modelo), pero en V1 ningún cálculo se va a ejercitar contra ellos.
> Período: **2025-04-26 a 2026-04-25**. Hoy ficticio del usuario = última fecha del dataset.

Los 4 datasets tienen **min/max/mean casi idénticos** por métrica. La diferencia no está en los niveles, está en la **trayectoria temporal de los últimos 30-60 días**. Cada uno cuenta una historia distinta que el dashboard debe sacar a la luz:

| Dataset | Historia | Señal cuantitativa (last 30d vs prior 30d) | Alerta esperada |
|---|---|---|---|
| **A** | **Pipeline pudriéndose** | `stale_deals` pasó de ~94 (mediana del año) a **180 al cierre** (+91 % vs 7d previos). | *Stale deals creciendo* (alta) |
| **B** | **Estable** | Sin desviaciones &gt;1σ vs baseline 30d. Win rate ~27 %, response time ~32 min. | Estado neutro: *"Hoy no hay focos rojos"* |
| **C** | **Conversión disparada (positiva)** | Win rate 28 % → **40.3 %**; close_rate del funnel 29 % → **44 %**. | *Win rate spike* (positiva) — **regla nueva V1** |
| **D** | **Tiempos de respuesta colapsan** | `avg_response_time_min` (ponderado por leads) 33 → **40.9 min** (+25 %); pico diario hasta 84 min. | *Response time spike* (alta) |

**Implicación de diseño:** la ventana default **30d** es la correcta para que las 4 historias salten — 7d es demasiado ruidoso para win rate (volúmenes diarios bajos: `deals_won` mediana = 3) y 90d diluye los movimientos recientes. Confirmar ADR-08.

**Implicación para el funnel:** en C el cuello (close_rate) cambió de mal a bueno; el funnel debe permitir **resaltar mejoras**, no solo cuellos. La barra del paso ganador se pinta verde cuando la conversión sube &gt;15 % vs baseline 30d.

**Implicación para outliers:** D tiene un día con response_time = 84 min (≈4× la mediana). La regla `|x − mediana_28d| &gt; 3·MAD` lo marca, pero **NO** se excluye del promedio ponderado del KPI (sería ocultar el problema). Sí se excluye solo de la línea suavizada de tendencia.

**Implicación para `stale_deals`:** en A va de 94 a 180 en pocos meses, casi duplicando. Confirmar que se trata como **stock (snapshot EOD)**: comparar `valor[hoy]` vs `valor[hoy − 7]` y mostrar el delta absoluto, no el porcentaje (un +91 % es ruidoso visualmente; "+86 stale deals en 7 días" es más legible).

### 5.11 Invariantes (auditables)
1. Counts → suma. Ratios → promedio ponderado. Snapshots → último/diff.
2. Nulls excluyen, nunca son 0.
3. Tasas de período = `suma / suma`, nunca media de tasas.
4. Color del delta depende de `direction`, no del signo.
5. Toda agregación expone `n_days_used` para auditar cobertura.

---

## 6. Especificación funcional

### 6.1 Las 5 preguntas de los 30 segundos
1. **¿Estamos cerrando?** Win rate 7d vs 7d previos.
2. **¿Estamos respondiendo rápido?** `avg_response_time_min` hoy + tendencia 7d.
3. **¿Dónde se atasca el funnel?** Etapa que rompió su tasa vs baseline.
4. **¿Qué deals están podridos?** `stale_deals` y delta semanal.
5. **¿Soporte está sangrando clientes?** Tickets + resolución, tendencia.

### 6.2 KPIs hero (6 tiles)

| KPI | Por qué |
|---|---|
| **Win rate 7d** | Métrica norte: cierre real, no actividad. |
| **Deals ganados 7d** | Win rate sin volumen engaña. |
| **Avg response time 7d** | Predictor temprano de conversión B2B. |
| **Stale deals (hoy)** | Riesgo acumulado: lo que se está dejando morir. |
| **Leads calificados 7d** | Salud del top-of-funnel comercial (no marketing). |
| **Support resolution hrs 7d** | Único proxy de churn-risk en el dataset. |

`traffic` y `deal_cycle` van como contexto secundario en el funnel, no como hero.

### 6.3 Reglas de alertas (insight feed, máx 3)

| Regla | Condición | Severidad | Tono |
|---|---|---|---|
| **Win rate dropped** | `win_rate_30d` cae &gt;15 % relativo vs prior 30d | alta | negativo |
| **Win rate spike** *(nueva V1)* | `win_rate_30d` sube &gt;25 % relativo vs prior 30d | media | positivo |
| **Response time spike** | `avg_response_time_30d` (ponderado) sube &gt;25 % vs prior 30d | alta | negativo |
| **Stale deals creciendo** | `stale_deals[hoy] − stale_deals[hoy−7] ≥ +10` (delta absoluto) | alta | negativo |
| **Funnel choke** | alguna conversión etapa-a-etapa cae &gt;20 % vs baseline 90d | alta | negativo |
| **Funnel breakthrough** *(nueva V1)* | alguna conversión sube &gt;20 % vs baseline 90d | media | positivo |
| **Support overload** | `tickets_30d` sube &gt;30 % o `resolution_hrs_30d` (ponderado) sube &gt;20 % | media | negativo |
| **Lead drought** | `leads_qualified_30d` cae &gt;25 % vs baseline 90d | media | negativo |
| **Response time outlier** | algún día con `avg_response_time_min > mediana_30d + 3·MAD` | media | negativo |

> **Justificación de las ventanas:** se cambió la ventana de evaluación de **7d → 30d** tras analizar `metrics.json` real: con `deals_won` mediana = 3/día, 7 días genera ratios inestables (un día sin cierres muta el win rate). 30d vs prior-30d es lo que hace que las historias de A/C/D salten correctamente.
> **Justificación del delta absoluto en stale_deals:** es un stock, no un flujo. Pasar de 94 a 180 deals atascados es "+86 stale deals", lectura más accionable que "+91 %".
> **Reglas positivas:** los datasets reales muestran movimientos buenos también (ej. C). Un dashboard que solo grita por lo malo pierde la oportunidad de capitalizar lo que está funcionando ("¿qué cambió este mes? hagamos más de eso").

Ordenar por severidad y magnitud; cortar en 3. Si no hay alertas: *"Hoy no hay focos rojos. Buen momento para revisar pipeline."*

### 6.4 Funnel
Barras horizontales de 5 pasos. Cada paso muestra: volumen absoluto + tasa al siguiente paso + delta vs baseline 30d (color rojo/amarillo/verde). Click en paso → tabla de los 5 días con peor conversión en la ventana.

### 6.5 Customer health
Card que cruza tickets + resolution + opcional dual-axis con `deals_lost` 30d. Si suben juntos: banner sugerente *"Soporte podría estar costando deals"* (correlación, no causalidad).

### 6.6 Lectura por dataset (criterio de aceptación, verificado contra `metrics.json`)

El sistema debe producir las siguientes lecturas en los 4 datasets reales del archivo. Estos casos son **tests de aceptación obligatorios** antes del DoD de la fase 5 (Insights):

| Dataset | Insight #1 esperado | Insight #2 esperado | KPI hero que debe llamar la atención | Funnel |
|---|---|---|---|---|
| **A** | *Stale deals creciendo* — pasaron de ~94 a 180 (+86 en 7 días). Foco: cleanup de pipeline. | *Win rate stable* — no hay drop, pero stale puede estar inflando artificialmente la cifra. | Tile **Stale deals** en rojo intenso, sparkline con curva clara de aceleración en últimos 60d. | Sin cuello evidente. |
| **B** | *"Hoy no hay focos rojos. Buen momento para revisar pipeline."* | — | Todos en neutro/verde leve. | Estable. |
| **C** | *Win rate spike* — 28 % → 40 % en 30 días. *"Algo cambió. Replicálo."* | *Funnel breakthrough* — close_rate 29 % → 44 %. | Tile **Win rate** en verde fuerte con badge `+44 %`. | Paso final del funnel resaltado en verde. |
| **D** | *Response time spike* — 33 → 41 min en últimos 30d. | *Response time outlier* — 1 día con 84 min. | Tile **Avg response time** en rojo, sparkline con cola alta a la derecha. | Posible drop en `qualify_rate` por respuestas lentas. |

Estos 4 escenarios cubren los modos de operación que el Jefe de Ventas debe poder leer sin tutorial.

### 6.7 Calls to action
- Click en KPI → bottom sheet / panel con chart 90d.
- Click en alerta → ancla a la sección + resalta la métrica.
- Click en paso del funnel → tabla de peores días.
- Toggle ventana global, persistido en URL.
- Compartir vista por URL (estado en query string).
- *"Marcar revisado"* en alerta → silenciada esa sesión (no persistente).

---

## 7. UX e Information Architecture

### 7.1 Jerarquía de información (de arriba hacia abajo)
1. **Header sticky:** brand · `DatasetSwitcher` (A/B/C/D) · `WindowSelector` · `ThemeToggle`.
2. **Insight feed:** hasta 3 cards — la respuesta antes que el dato.
3. **KPI grid:** 6 tarjetas hero.
4. **Funnel.**
5. **Customer health.**
6. **Secundarias:** traffic, deal cycle, tickets detalle.

### 7.2 Navegación
**Single-page scrollable** con anclas. Sin bottom nav (no hay multi-app). Sin tabs (oculta info y obliga a recordar dónde está cada sección). El scroll vertical es el gesto nativo en mobile.

### 7.3 Switch de datasets
Segmented control sticky de 4 chips (A/B/C/D). Cambio sin recarga, fade 200 ms en valores. Estado persistido en `?ds=A&range=30d` + `localStorage`. **Swipe horizontal** entre datasets en mobile.

### 7.4 Layout

**Mobile (≤768 px):**
- Header sticky, una columna.
- Insights apilados (3 cards).
- KPIs en grid 2×3.
- Funnel vertical (escalones apilados).
- Secundarias 1 columna.

**Desktop (≥1024 px):**
- Header full-width.
- Insights en fila de 3.
- KPIs en grid 3×2.
- Funnel horizontal de 5 pasos en línea.
- Secundarias 2-3 columnas.

CSS Grid + container queries — mismas tarjetas, distinto flujo.

### 7.5 Drill-down
Toque en KPI → **bottom sheet** (mobile) / **side panel derecho** (desktop). Contiene: valor + delta + chart 90d + mejor/peor día + promedio + botón "Ver período completo". Sin ruta dedicada — el contexto del dashboard se mantiene atrás.

### 7.6 Filtros temporales
Chips: `7d` · **`30d` (default)** · `90d` · `MTD` · `QTD` · `365d`. Sin date picker.

### 7.7 Accesibilidad
- Contraste WCAG AA (≥4.5:1 texto, ≥3:1 UI).
- Focus ring 2 px con offset.
- `aria-label` descriptivo en KPI cards: *"Win rate, 34 %, bajó 5 puntos vs período anterior"*.
- Navegación completa por teclado (Tab, Enter, Esc cierra sheet).
- Color **nunca solo señal**: deltas con icono ↑↓ + signo.
- `prefers-reduced-motion` respetado.

### 7.8 Onboarding cero
- Títulos en español llano.
- Tooltip discreto `(?)` en jerga (Stale deals, Win rate).
- Sin tour, sin modal de bienvenida.

### 7.9 Errores y empty states
Tono directo, sin disculpas teatrales:
- Sin datos: *"Sin movimiento en este período. Probá ampliar la ventana."*
- Error de carga: *"No pudimos traer los datos. Reintentar."*
- Null puntual: gap en línea + "sin registro" en tooltip.

### 7.10 Microcopy de referencia
- Delta positivo bueno: `+12 %` verde con ↑.
- Delta negativo malo: `−8 %` rojo con ↓.
- Header: *"Hoy, 8 may 2026 · Dataset A · Últimos 30 días"*.
- CTA insight: *"Revisar respuestas"*.

### 7.11 Anti-patrones (prohibidos)
Modales bloqueantes, popups de bienvenida, carruseles auto-play, animaciones &gt;250 ms, parallax, pies con +5 slices, donuts apilados, gráficos 3D, áreas saturadas, date pickers calendario, "wall of numbers" sin jerarquía, semáforos sin texto, deltas sin contexto temporal, tabs que oculten funnel o alertas, toasts efímeros para errores críticos.

---

## 8. Sistema de diseño

Inspiración: **Linear, Stripe Dashboard, Vercel**. Tipografía precisa, neutrales fríos, color con intención.

### 8.1 Color (tokens)

**Modo claro**
- `bg #FAFAFA` · `surface #FFFFFF` · `surface-2 #F4F4F5`
- `border #E4E4E7` · `border-strong #D4D4D8`
- `text #09090B` · `text-muted #52525B` · `text-subtle #A1A1AA`

**Modo oscuro**
- `bg #09090B` · `surface #18181B` · `surface-2 #27272A`
- `border #27272A` · `border-strong #3F3F46`
- `text #FAFAFA` · `text-muted #A1A1AA` · `text-subtle #71717A`

**Acento (marca, neutro en KPIs):** `indigo #6366F1` / dark `#818CF8`.

**Semánticos (direction-aware):**
- Positivo `#10B981` / dark `#34D399`
- Negativo `#EF4444` / dark `#F87171`
- Warning `#F59E0B` / dark `#FBBF24`
- Info `#3B82F6`

**Dataset palette:** A `#6366F1` · B `#14B8A6` · C `#F59E0B` · D `#EC4899`.

Todos los pares texto/fondo cumplen WCAG AA.

### 8.2 Tipografía
**Geist Sans** (UI) + **Geist Mono** + `font-variant-numeric: tabular-nums` en cifras. Fallback `Inter, system-ui, -apple-system`.

| Rol | Tamaño/LH | Peso | Tracking |
|---|---|---|---|
| Display KPI | 40/48 | 600 | -0.02em |
| H1 | 28/36 | 600 | -0.01em |
| H2 | 22/30 | 600 | normal |
| H3 | 18/26 | 500 | normal |
| Body | 15/22 | 400 | normal |
| Small | 13/18 | 400 | normal |
| Caption | 11/16 | 500 | uppercase 0.04em |

Pesos permitidos: 400, 500, 600. **Nunca 700.**

### 8.3 Espaciado y radii
Escala base 4: `4 8 12 16 20 24 32 40 48 64`. Padding card: 20 mobile / 24 desktop. Gap KPI tiles: 12 mobile / 16 desktop. Container max 1280, padding lateral 16/24/32.
Radii: `sm 6` · `md 10` · `lg 14` · `xl 20`. Sombras mínimas: `0 1px 2px rgba(0,0,0,0.04)` claro; en oscuro solo border.

### 8.4 Componentes clave
- **KPICard:** label (caption muted) + display number + delta badge + sparkline 30d full-width abajo. Tap → drill-down.
- **DatasetSwitcher:** segmented control sticky, height 36, pill activa elevada.
- **DirectionAwareBadge:** lee `direction` de metadata. Up + higher → verde; up + lower → rojo. Icono `arrow-up-right` / `arrow-down-right`, 12 px.
- **FunnelView:** barras horizontales con conversión entre pasos (texto subtle).
- **MetricChart:** line/area, área con gradient fade.
- **Modal:** centrado con backdrop, focus trap, scroll lock, restore focus.

### 8.5 Charts
Gridlines `border` 1 px dashed solo horizontal. Ejes sin línea, ticks `text-subtle` 11 px. Tooltip: card surface + border, fecha en mono. Línea 1.5 px, dot solo en hover. `null` → gap (no interpolar).

### 8.6 Sparklines
Altura 32-40 px, sin ejes ni labels, line 1.5 px, último punto con dot 3 px en color semántico (delta vs inicio). Área con gradient 12 % opacity. 30 puntos.

### 8.7 Estados
- **Loading:** skeletons con shimmer sutil 1.4 s, mismo layout final (sin spinners).
- **Empty:** ilustración mínima monocromo + copy corto.
- **Null/no data:** `—` muted + tooltip *"Sin datos este día"*.
- **Error:** card inline con `alert-circle` + `Reintentar`.

### 8.8 Microinteracciones
Transiciones 150-250 ms, easing `cubic-bezier(0.16, 1, 0.3, 1)` (out-expo). Hover: surface +1 step. Press: scale 0.98. Switch dataset: fade+slide 200 ms. Respeta `prefers-reduced-motion`.

### 8.9 Iconografía
**Lucide React**, stroke 1.5, 16/20/24. Nunca filled. Color `text-muted` por default.

### 8.10 Mobile-first
Targets ≥44 px. Safe-area insets respetados. Bottom sheet con drag handle. Swipe horizontal entre datasets.

---

## 9. Performance y eficiencia

Dataset confirmado: **~652 KB JSON** (4 × 365 × 11). Cabe en memoria; el cuello real es **render mobile + first paint**, no cómputo.

### 9.1 Carga del JSON
- **Bundlear como asset estático** vía `import` en build (no en `/public`); Vite le pone hash y `Cache-Control: immutable`.
- `<link rel="preload" as="fetch" crossorigin>` en `index.html` si se carga vía fetch.
- Gzip/Brotli reduce 652 KB → ~80-120 KB en la red.
- **No lazy-load por dataset:** el costo es bajo y el switch debe ser instantáneo.
- **Web Workers:** no en V1. Las agregaciones tardan &lt;5 ms. Reservado si aparece jank medible.

### 9.2 Indexado y memoización
Por cada dataset, una sola vez al cargar:
```
{ [metricKey]: { values: Float64Array(365), mask: Uint8Array(365), dates: string[] } }
```
- Typed arrays = ~8× más rápido en sumas/medias.
- Máscara `Uint8Array` resuelve nulls en un solo pase (sin `if` por elemento).
- Derivados (rolling 7/30/90, deltas, win rate, conversiones) se cachean con `useMemo([datasetId, windowDays])`.

### 9.3 State (Zustand)
3 piezas: `currentDataset`, `windowDays`, `theme`. Selectores granulares evitan cascada. Context puro descartado por re-render global.

### 9.4 Charting: Recharts (V1) → uPlot (si lo exige Lighthouse)
- **Recharts** ~95 KB gz, SVG, DX excelente. Aceptable para 6 charts simultáneos × 365 puntos.
- **uPlot** ~45 KB, canvas. Migrar si Lighthouse mobile cae &lt;90.
- Cargado con `import()` dinámico **después** del primer paint de KPIs.

### 9.5 Code splitting
- Una sola ruta. **No splitting por ruta.**
- `React.lazy` solo para el bottom sheet de detalle.
- Suspense con skeletons del KPI grid (no spinners) para ver estructura inmediata.

### 9.6 Métricas objetivo
**FCP &lt;1.0 s · LCP &lt;1.8 s · TTI &lt;2.5 s · INP &lt;200 ms · CLS &lt;0.05.**
Medición: Lighthouse en Chrome DevTools sobre `vite preview` con throttling "Slow 4G" en localhost. Sirve como **proxy de calidad de bundle**, no como SLA real (no hay red de por medio en V1; ADR-20). Bundle budget: **&lt;150 KB gz inicial.**

### 9.7 Manejo de nulls eficiente
Pre-procesar al cargar: `Float64Array` con `NaN` + `Uint8Array` máscara. Sumas/medias usan la máscara en un solo pase. Charts reciben `null` y dibujan gap nativo.

---

## 10. Seguridad

> **Contexto V1: ejecución local.** La app corre en `localhost` en la máquina del evaluador. No hay dominio público, no hay TLS termination de proveedor, no hay buscadores indexando, no hay tráfico de red más allá del navegador local. Eso reduce drásticamente la superficie de ataque y reordena las prioridades respecto a una versión hosteada. Los controles de hosting (CSP en producción, HSTS, password protection, Cloudflare Access, etc.) se mueven a §13 Roadmap V2.

### 10.1 Threat model corto (local)
- **Activos:** `metrics.json` (KPIs internos), integridad del bundle local, máquina del evaluador.
- **Actores realistas en V1:** dependencia npm comprometida (supply chain), error de implementación que filtre datos por consola/localStorage, otro proceso local con acceso a `localhost` (raro pero no imposible en máquinas compartidas).
- **Actores fuera de alcance V1:** atacantes remotos, scrapers, buscadores, MITM en internet, exfiltración por analytics terceros (no se incluyen analytics).
- **Clasificación del dato:** **interno confidencial** — el repo se entrega a PALVI; no se publica.

### 10.2 MUST (V1, bloqueantes)
- **M1.** `metrics.json` se importa como módulo en build (`import data from './metrics.json'`); Vite lo bundlea con hash. **No** servirlo desde `/public`.
- **M2.** Prohibido `dangerouslySetInnerHTML`. ESLint `react/no-danger` activo y bloqueante en CI local.
- **M3.** Sin secretos en el repo. `.env*` en `.gitignore`. No se usa ninguna variable `VITE_*` con datos sensibles.
- **M4.** Lockfile commiteado (`package-lock.json`). `npm audit --omit=dev` corre en el script `npm test` o `prebuild` y falla en vulnerabilidades `high`/`critical`.
- **M5.** `localStorage` solo para preferencias UI (dataset activo, ventana, tema). Nunca cachear `metrics.json` ni valores derivados.
- **M6.** No `console.log` de datos del JSON en build de producción (regla ESLint `no-console: ['error', { allow: ['warn', 'error'] }]` activa solo en `production`).
- **M7.** Charting con librerías que rendericen SVG vía React (Recharts). Ningún componente acepta strings HTML crudos en labels o tooltips.

### 10.3 SHOULD (calidad)
- **S1.** Source maps fuera del bundle de producción (`build.sourcemap: false`). El JSON aparecería legible en el map.
- **S2.** Dependencias mínimas. Cada `npm install <pkg>` requiere justificación en §16 (decisiones de desarrollo) con changelog del paquete revisado.
- **S3.** Sin CDN de terceros (`<script src="https://...">` prohibido). Fuentes Geist self-hosted desde `public/fonts/`.
- **S4.** README incluye una nota: *"Esta app contiene datos de negocio confidenciales en el bundle. No subir el repo a un host público sin antes revisar §10 y agregar auth."*

### 10.4 COULD (V2 cuando se hostee — ver §13)
CSP estricta con headers de hosting, HSTS, `robots.txt`, `noindex`, password protection (Vercel/Cloudflare Access), SRI, telemetría privada, rotación de path. **Estos controles no aplican en V1 local pero quedan documentados para no rehacer el análisis cuando se decida hostear.**

### 10.5 Invariantes de seguridad
1. Ningún dato de negocio sale del navegador hacia terceros (sin analytics, sin telemetría, sin endpoints externos).
2. Ningún render usa HTML crudo proveniente de datos.
3. Ningún secreto vive en repo ni en variables `VITE_*`.
4. Toda dependencia nueva pasa por `npm audit` y review manual del changelog (registrado en §16).
5. El repo se entrega como código fuente + `metrics.json`, nunca como un link público.

---

## 11. Decisiones técnicas (ADR ligero)

> Formato: **Decisión · Alternativas descartadas · Razón.**

| # | Decisión | Alternativas descartadas | Razón |
|---|---|---|---|
| ADR-01 | **Vite + SWC** como build tool | CRA (deprecado), Webpack (config pesada), Next.js (overkill SSR) | SPA estática, HMR rápido, salida deployable a CDN. |
| ADR-02 | **Tailwind CSS + CSS vars** | CSS Modules, Styled Components, vanilla-extract | Velocidad iteración + dark mode con tokens sin duplicar clases. |
| ADR-03 | **Zustand** para estado | Context puro, Redux Toolkit, Jotai | 3 piezas de estado; selectores granulares evitan re-render en cascada. |
| ADR-04 | **Recharts** (V1) | uPlot, Visx, Chart.js, Nivo, lightweight-charts | DX para series temporales chicas; migrar a uPlot si Lighthouse lo pide. |
| ADR-05 | **Single page sin router** | React Router | El producto es una sola página; query params bastan para estado. |
| ADR-06 | **JSON bundleado en build** | `/public/metrics.json`, fetch dinámico | Hash + cache inmutable; mejor seguridad (no URL adivinable). |
| ADR-07 | **Typed arrays + máscara de nulls** | Array de objetos, lodash, Map por día | Performance + correctitud en agregaciones. |
| ADR-08 | **30d como ventana default y de evaluación de alertas** | 7d (ruidoso), 90d (diluye) | Verificado contra los 4 datasets reales: con `deals_won` mediana = 3/día, 7d desestabiliza win rate; 30d es lo que hace saltar las historias de A/C/D. |
| ADR-09 | **Win rate y funnel rates con `suma/suma`** | Media móvil de ratios diarios | Correctitud estadística (período, no cohorte de medias). |
| ADR-10 | **Promedios ponderados para `avg_response_time`, `deal_cycle`, `resolution_hours`** | Promedio simple de promedios diarios | Cada día tiene volumen distinto; promediar promedios distorsiona. |
| ADR-11 | **Reglas de alerta deterministas, relativas a baseline propio, con tono positivo y negativo** | Umbrales fijos, ML, solo alertas negativas | Verificado contra los 4 datasets: B no genera alertas (correcto), C produce *Win rate spike* (positiva), A produce *Stale deals creciendo* (delta absoluto), D produce *Response time spike* + *outlier*. Sin tono positivo, el dashboard no celebra C. |
| ADR-17 | **`stale_deals` se compara con delta absoluto, no porcentual** | Delta % como en el resto | Es un stock (snapshot EOD). En dataset A pasa de 94 a 180: "+86 stale deals" es más legible y accionable que "+91 %". |
| ADR-18 | **El sistema tolera nulls aunque los datasets actuales tengan cero** | Asumir no-nulls y simplificar el código | El task lo exige por contrato y los datasets futuros pueden traerlos. La máscara `Uint8Array` añade ~1 % de overhead, vale la pena. |
| ADR-19 | **Outliers se marcan visualmente pero NO se excluyen del KPI** | Excluir del promedio ponderado | El día de 84 min en D es la noticia, no el ruido. Excluirlo oculta el problema. Solo se excluye de la línea suavizada de tendencia. |
| ADR-12 | **Geist Sans/Mono self-hosted** | Inter, system stack puro, Google Fonts CDN | Tabular numerals + privacidad (sin CDN tercero) + tono premium. |
| ADR-13 | **Lucide icons** | Heroicons, Phosphor, Material Icons | Stroke uniforme, coherencia con Linear/Vercel. |
| ADR-14 | **Vitest + Testing Library** | Jest | Mismo runner que Vite, jsdom rápido. |
| ADR-15 | **No backend en V1** | Function edge para servir JSON con auth | Mantener alcance acotado; evaluar V2 si el deploy es público. |
| ADR-20 | **Ejecución local únicamente — sin despliegue cloud en V1** | Vercel/Netlify/Cloudflare Pages | Es el modo de entrega solicitado. Reduce superficie de ataque, elimina coste y configuración de hosting, simplifica el threat model (§10) y el README (instrucciones reducidas a `npm install && npm run dev`). Lo que se deja de lado: URL para compartir, auth real, headers HTTP en producción, telemetría, lighthouse en condiciones de red reales. Todo eso queda en §13. |
| ADR-16 | **`prefers-color-scheme` + toggle manual con `localStorage`** | Solo automático, solo manual | Mejor UX y respeta preferencia del SO. |

---

## 12. Plan de implementación

### Fase 0 — Setup (medio día)
- Vite + TS strict + ESLint + Prettier + Tailwind + Vitest.
- Tokens CSS (color, espaciado, tipografía).
- Scripts npm: `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `audit` (encadena `npm audit --omit=dev`).
- README con instrucciones para correr local (Node 20 LTS + `npm install && npm run dev`).
- Sin GitHub Actions, sin headers de hosting (V1 local — ver ADR-20).

### Fase 1 — Datos (medio día)
- `data/schema.ts` con tipos canónicos.
- `data/load.ts` + validación (zod o narrowing manual).
- `data/transform.ts` con typed arrays + máscara de nulls.
- `data/aggregations.ts`: `sum`, `weightedAvg`, `winRate`, `funnelRates`, `delta`, `rolling`.
- Tests de agregaciones con fixtures de los 4 datasets, especialmente nulls y edge cases.

### Fase 2 — Layout y design system (1 día)
- Tokens, primitives (Card, Badge, SegmentedControl, Modal, Skeleton).
- Header sticky con `DatasetSwitcher`, `WindowSelector`, `ThemeToggle`.
- Estado en Zustand + persistencia en URL/localStorage.

### Fase 3 — KPIs y sparklines (1 día)
- `KPICard` + `Sparkline` + `DirectionAwareBadge`.
- Grid responsivo (mobile 2×3, desktop 3×2).
- Drill-down con `Modal` centrado y chart 90d.

### Fase 4 — Funnel + customer health (medio día)
- `FunnelView` con tasas de conversión y resaltado del cuello.
- Card de customer health con dual-axis opcional.

### Fase 5 — Insights (medio día)
- `data/insights.ts` con **9 reglas** (ver §6.3): 6 negativas + 2 positivas + 1 outlier.
- `InsightFeed` con orden por severidad y dismiss en sesión, soporte de tono positivo/negativo.
- **Tests de aceptación contra `metrics.json`:** los 4 escenarios de §6.6 deben producir los insights esperados (A→stale, B→neutro, C→win rate spike, D→response time spike+outlier). Si alguno falla, el sistema no está listo.

### Fase 6 — Pulido y QA (1 día)
- Modo oscuro, accesibilidad (axe), pruebas en 4 datasets.
- Lighthouse CI &gt;90 mobile.
- README de 1 página: decisiones técnicas + segunda iteración.

### Definition of Done por feature
- Tipos TS sin `any`.
- Tests unitarios de la lógica de cálculo (cuando aplica).
- Renderiza en los 4 datasets sin errores.
- Accesible por teclado.
- Mobile y desktop verificados.

---

## 13. Roadmap V2

Lista priorizada de lo que **no** entra en V1 y por qué tiene sentido más adelante:

0. **Despliegue en la nube + cinturón de seguridad de hosting** (ADR-20). Activar en V2: hosting estático (Vercel/Netlify/Cloudflare Pages), headers HTTP completos (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy), `robots.txt` con `Disallow`, source maps off en prod, GitHub Actions con typecheck+lint+test+build+lighthouse-ci. Todo el §10 *COULD* se promueve a *MUST* en este momento.
1. **Auth liviana** (Vercel Password / Cloudflare Access) cuando se comparta el link a stakeholders externos.
2. **Comparador multi-dataset** side-by-side (overlays A vs B en charts y deltas cruzados).
3. **Exportación CSV/PNG** de la ventana activa para llevar a la reunión.
4. **Anotaciones manuales** sobre días específicos (lanzamientos, incidentes).
5. **Configurador de umbrales** de alerta.
6. **Ingesta real** desde CRM (Salesforce/HubSpot) reemplazando el JSON estático.
7. **Notificaciones push** matutinas con el insight #1.
8. **Cohortes reales** del funnel (no solo period rates).
9. **Migración Recharts → uPlot** si Lighthouse mobile cae.
10. **Telemetría RUM** self-hosted (Plausible/Umami) para validar tiempos reales de uso.

---

## 14. Glosario

- **Lead** — persona/empresa que mostró interés. `leads_created` cuenta los nuevos del día.
- **Lead calificado** — lead evaluado por ventas como prospecto real (fit, presupuesto, timing). `leads_qualified`.
- **Deal** — oportunidad de venta sobre un lead calificado. `deals_created`.
- **Deal ganado / perdido** — `deals_won` / `deals_lost`, cerrados hoy con cada resultado.
- **Tiempo de respuesta** (`avg_response_time_min`) — minutos desde que llega un lead hasta el primer contacto. En B2B, lento = conversión cae.
- **Deal cycle** (`avg_deal_cycle_days`) — días entre apertura y cierre, promediado sobre los deals que cerraron ese día.
- **Stale deal** (`stale_deals`) — deal abierto &gt;60 días sin cerrar. Conteo al final del día.
- **Win rate** — `sum(deals_won) / sum(deals_won + deals_lost)` en una ventana. Métrica de período, no de cohorte.
- **Funnel** — `traffic → leads → qualified → deals → won`. Cada paso con su tasa.
- **Tickets de soporte** — `support_tickets_opened` (volumen del día), `support_avg_resolution_hours` (promedio de resolución de los abiertos hoy).

---

## 15. Bitácora viva

> Esta sección se actualiza durante el desarrollo. Cada entrada: fecha · cambio · razón · impacto.

| Fecha | Cambio | Razón | Impacto |
|---|---|---|---|
| 2026-05-08 | Creación del SDD v0.1 a partir de `task.md` y los 4 datasets | Alineación previa a implementación | Base para todas las decisiones siguientes |
| 2026-05-08 | **SDD v0.3** — modo de ejecución local | Decisión del usuario: V1 corre solo en máquina local, sin despliegue cloud | Ajustes: (1) NF5/NF6 reformulados a "ejecución local". (2) §10 Seguridad reescrita con threat model local (controles de hosting movidos a §13). (3) ADR-20 nuevo. (4) Roadmap V2 incorpora bloque "despliegue + headers + CI" como punto 0. (5) Fase 0 del plan: sin GitHub Actions ni headers en V1. (6) Métricas Lighthouse pasan a ser proxy local (`vite preview` + DevTools throttling), no SLA. (7) Nueva §16 para registrar decisiones tomadas durante el desarrollo, con motivación y trade-offs. |
| 2026-05-08 | **SDD v0.2** — análisis empírico de `metrics.json` | Ajustar decisiones a la realidad del archivo, no a suposiciones | (1) Confirmado tamaño 668 KB y rango 2025-04-26→2026-04-25. (2) Identificada historia de cada dataset (A=stale, B=estable, C=win rate spike, D=response time). (3) Cambiada ventana de evaluación de alertas 7d→30d (ADR-08). (4) Añadidas alertas positivas (*Win rate spike*, *Funnel breakthrough*). (5) `stale_deals` ahora compara delta absoluto (ADR-17). (6) Confirmado que datasets actuales no traen nulls — manejo se mantiene como contrato (ADR-18). (7) Outliers marcados pero no excluidos del KPI (ADR-19). (8) Tests de aceptación contra los 4 datasets convertidos en DoD de Fase 5. |

### Preguntas abiertas
- ¿El JSON debe permanecer público después del review de PALVI o requerirá auth? (afecta ADR-15.)
- ¿Hay preferencia de tipografía corporativa que reemplace Geist? (afecta ADR-12.)
- ¿Los 4 datasets se mantendrán como alternativas o se elegirá uno como "real" para producción?
- ¿La fecha "hoy" del usuario es siempre la última del dataset o se permitirá `?date=YYYY-MM-DD` para auditar el dashboard en momentos pasados? (Decisión por defecto V1: última fecha del dataset.)
- En los datasets actuales no hay nulls. ¿Hay datasets de prueba con nulls reales que se puedan compartir para validar el camino crítico de §5.5?

### Riesgos abiertos
- **R1.** Recharts puede no cumplir Lighthouse mobile &gt;90 con 6 charts simultáneos → mitigación: lazy load + plan de migración a uPlot.
- **R2.** Reglas de alertas pueden generar falsos positivos en datasets ruidosos → mitigación: usar `>1σ` sobre baseline 30d, no umbrales absolutos.
- **R3.** Bundleado del JSON en build sube el tamaño del chunk inicial → mitigación: el JSON va como asset hashed separado, no inline.

---

## 16. Decisiones de desarrollo (log vivo)

> **Propósito.** §11 (ADRs) es un mapa de decisiones grandes tomadas *antes* de programar. Esta sección es el log de las decisiones que aparecen *durante* la implementación: elegir una librería concreta, cómo modelar un componente, cómo manejar un edge case, qué descartar cuando un enfoque no rinde. Cada entrada deja explícito **qué se eligió, por qué, y qué se dejó de lado** (con sus puntos buenos y malos), para que la decisión sea auditable y revertible si más adelante cambia el contexto.
>
> **Regla:** una entrada por decisión. Nada de "se hicieron varias cosas". Si una entrada vieja queda obsoleta, no se borra: se añade una nueva que la *supersede* y se marca la vieja con `~~tachado~~` + nota.

### 16.1 Formato

Cada decisión se documenta con esta plantilla mínima:

```markdown
#### DEV-NN · YYYY-MM-DD · <Título corto>
**Contexto:** qué problema apareció o qué había que decidir.
**Decisión:** qué se hizo.
**Por qué:** los 1-3 motivos que pesaron más.
**Alternativas consideradas:** lista corta, cada una con su pro y su contra.
**Lo que se deja de lado:** lo bueno que se sacrifica + lo malo que se evita al elegir esto.
**Impacto:** archivos, ADRs, secciones del SDD que cambian. Si nada, decir "ninguno".
**Reversibilidad:** alta / media / baja, y qué haría falta para deshacer.
```

### 16.2 Convenciones

- **Numeración:** `DEV-01`, `DEV-02`… secuencial, nunca se reutiliza un número.
- **Granularidad:** registrar lo que un colega no podría inferir leyendo solo el código (motivos, descartes). No registrar "renombré una variable".
- **Cuándo escribir:** justo después de tomar la decisión, antes de pasar a la siguiente tarea. Si pasaron horas, probablemente se olvidó algún trade-off.
- **Vínculo con ADRs:** si una decisión de desarrollo contradice o evoluciona un ADR de §11, mencionar el ADR explícitamente y marcar si lo refuerza, lo afina o lo reemplaza.
- **Vínculo con la bitácora:** §15 sigue siendo el resumen ejecutivo por versión del SDD; §16 es el detalle por decisión de implementación. Una entrada en §16 no necesita propagarse a §15 salvo que cambie el alcance o un requerimiento.

### 16.3 Categorías sugeridas (etiqueta opcional al inicio del título)

`[stack]` `[data]` `[ui]` `[perf]` `[a11y]` `[sec]` `[test]` `[devx]` `[copy]` `[bug]`

### 16.4 Entradas

<!-- Añadir entradas nuevas debajo de esta línea, en orden cronológico (más antigua arriba). -->

#### DEV-00 · 2026-05-08 · [meta] Inauguración del log de decisiones
**Contexto:** el SDD necesita un mecanismo de documentación viva que registre las decisiones que se toman *durante* la implementación, no solo las pre-acordadas en §11.
**Decisión:** crear esta sección §16 con plantilla, convenciones y categorías. Las decisiones futuras se registran con numeración `DEV-NN`.
**Por qué:** (1) auditabilidad: cualquier choice cuestionable tiene su justificación escrita; (2) reversibilidad: con motivos y alternativas explícitos, deshacer una decisión es barato; (3) onboarding: un colaborador nuevo entiende por qué el código es como es sin tener que adivinar.
**Alternativas consideradas:**
- *Solo comentarios en el código.* Pro: están donde duele. Contra: invisibles para PMs/diseño, se pierden al refactorizar, no capturan trade-offs descartados.
- *Carpeta `/docs/adr` con un archivo por decisión.* Pro: estándar conocido. Contra: fragmenta el SDD; el evaluador tendría que abrir N archivos para reconstruir el contexto. Para un proyecto de 1 entregable, una sección sirve mejor.
- *Solo bitácora §15.* Pro: ya existe. Contra: §15 es resumen por versión del SDD, no por decisión de implementación; mezclar las dos cosas reduce la utilidad de ambas.
**Lo que se deja de lado:** el formato adoptado fuerza disciplina (escribir cada vez), pero a cambio se gana trazabilidad. Riesgo aceptado: si la disciplina cae, la sección queda desactualizada — la mitigación es que es la primera referencia que se consulta al cambiar algo.
**Impacto:** §15 v0.3 se complementa con esta sección. Ningún archivo de código.
**Reversibilidad:** alta. Si no se usa, se borra sin tocar otra cosa.

#### DEV-01 · 2026-05-08 · [stack][sec][devx] Ejecución local únicamente — sin despliegue cloud en V1
**Contexto:** la entrega original contemplaba un despliegue estático en Vercel/Netlify/Cloudflare Pages. El usuario aclaró que la app se va a ejecutar **localmente** en la máquina del evaluador, no se va a hostear. Hay que ajustar SDD, alcance y prioridades antes de empezar a programar.
**Decisión:** V1 corre solo en local con Node 20 LTS. Flujo único soportado: `npm install` + `npm run dev` (modo desarrollo) o `npm run build && npm run preview` (build de producción servido desde localhost). Ningún paso del entregable depende de un proveedor cloud.
**Por qué:**
1. **Es el modo de entrega solicitado** — el evaluador clona el repo y lo corre. No tiene sentido pagar coste de configuración de hosting si nadie lo va a abrir vía URL pública.
2. **Reduce drásticamente la superficie de ataque** — no hay dominio, no hay buscadores, no hay TLS de proveedor; el threat model se simplifica a supply chain + errores de implementación (ver §10.1).
3. **Acelera el entregable** — sin GitHub Actions, sin `vercel.json`/`_headers`, sin variables de entorno de plataforma, el SDD adelgaza y la Fase 0 baja de 1 día a medio día.
**Alternativas consideradas:**
- *Despliegue en Vercel con Password Protection.* **Pro:** URL para compartir, demo en vivo, lighthouse "real". **Contra:** requiere cuenta + plan Pro o configuración de Cloudflare Access; añade headers, CSP, source-maps-off, robots.txt, CI completa; el evaluador podría querer probar offline. No alineado con la entrega solicitada.
- *Docker Compose + nginx local.* **Pro:** parecido a producción, headers reales, fácil de extender. **Contra:** requiere Docker en la máquina del evaluador (no garantizado), añade un layer que no aporta a un dashboard de 11 métricas. Sobreingeniería para V1.
- *GitHub Pages.* **Pro:** gratis y trivial. **Contra:** publica el `metrics.json` confidencial en una URL adivinable e indexable; viola los invariantes de seguridad de §10.5.
- *Servir desde un script Python (`python -m http.server`).* **Pro:** mínimo absoluto. **Contra:** ya hay `vite preview`, que sirve igual con compresión y sin añadir runtime.
**Lo que se deja de lado:**
- **Bueno que se sacrifica:** URL para compartir con stakeholders, lighthouse-ci continuo en cada PR, headers HTTP completos en producción (CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy), source maps fuera del bundle servido, telemetría privada self-hosted, password protection, ZAP baseline en CI.
- **Malo que se evita:** coste y configuración de hosting, riesgo de exposición pública del JSON, complejidad de secretos en plataforma, dependencia operativa de un proveedor externo, deuda de monitoreo (uptime, errores en prod) que no aporta a un MVP.
- **Trade-off explícito aceptado:** las métricas Lighthouse en V1 son **proxy de calidad de bundle**, no SLA — se miden con `vite preview` + Chrome DevTools throttling "Slow 4G". Eso es suficiente para validar el budget de 150 KB gz pero no garantiza tiempos en una red real.
**Impacto:**
- ADR-20 (§11) registra la decisión a nivel arquitectural.
- §1.4 criterios de éxito: Lighthouse pasa a proxy local; nuevo criterio "setup verificable &lt;2 min".
- §3.1/3.2 NF5/NF6: ejecución local + servidor estático local.
- §9.6: medición localhost, no red real.
- §10 Seguridad: threat model reescrito; controles de hosting (CSP, HSTS, robots, password protection, source maps off, dependabot, SRI, telemetría) movidos a §13.
- §12 Fase 0: sin GitHub Actions, sin headers de hosting, scripts npm como contrato de entrega.
- §13 Roadmap V2: nuevo punto 0 que agrupa todo el bloque "despliegue + headers + CI" como pre-requisito de promoción a producción.
- README: instrucciones reducidas a Node 20 + `npm install` + `npm run dev`.
**Reversibilidad:** **alta.** Para hostear V2 basta con (1) ejecutar el plan §13 punto 0 (hosting + headers + CI), (2) añadir auth si la URL es pública, (3) re-ejercitar §10 *COULD* como *MUST*. Ningún cambio en el código de la app es necesario; el bundle de Vite ya es estático y portable.

#### DEV-02 · 2026-05-08 · [devx] Estructura del repo: scaffold en la raíz, `metrics.json` bajo `src/data/`
**Contexto:** la carpeta de trabajo ya contiene `task.md`, `task.pdf`, `metrics.json` y `SDD.md`. Antes del scaffold de Vite hay que decidir dónde vive el proyecto y dónde queda el JSON de datos.
**Decisión:** scaffold de Vite **en la raíz** del directorio actual (mismo nivel que `SDD.md` y `task.md`). El archivo `metrics.json` se mueve a `src/data/metrics.json` para que se importe como módulo (`import data from './data/metrics.json'`) y Vite lo bundlee con hash junto al resto de los assets.
**Por qué:**
1. **Un solo repo entregable** — el evaluador clona, ve `README.md` + `SDD.md` + `package.json` en la raíz y entiende todo de un vistazo.
2. **Cumple M1 de §10** — el JSON queda dentro del bundle hasheado, no en `/public` ni en raíz como asset crudo servible.
3. **Convención estándar de un proyecto Vite/React** — sin sorpresas para quien lo abra.
**Alternativas consideradas:**
- *Subcarpeta `app/` con la app y la raíz como workspace de docs.* **Pro:** separa docs de código. **Contra:** el evaluador tiene que `cd app/` antes de `npm install`; sumar fricción gratuita; el `package.json` deja de ser la "puerta de entrada" del repo.
- *Carpeta hermana, dejar este directorio solo para docs.* **Pro:** docs intactas. **Contra:** dos repos (o uno con dos roots) para un solo entregable; complica clonar y correr.
- *Mantener `metrics.json` en la raíz e importarlo con path relativo `../metrics.json`.* **Pro:** coincide con donde está hoy. **Contra:** path "fuera de `src/`" rompe lint reglas estándar y deja un asset confidencial en la raíz visible (y peor si alguien sirve la raíz por error).
**Lo que se deja de lado:** la separación visual docs/código (mitigación: las docs están en archivos `.md` claramente nombrados; ningún colaborador las va a confundir con código).
**Impacto:** §4.2 estructura de carpetas se cumple tal cual está. README documenta ruta del JSON. Ningún ADR cambia.
**Reversibilidad:** **alta.** Mover `metrics.json` y ajustar el import son 2 líneas.

#### DEV-03 · 2026-05-08 · [stack][devx] Package manager: npm + Node 20 LTS, con pin (`.nvmrc` y `engines`)
**Contexto:** primer comando que toca el evaluador al clonar es el de instalar dependencias. La elección de gestor y versión de Node afecta portabilidad y tiempo de setup.
**Decisión:** **npm 10+** como gestor único. **Node 20 LTS o superior** como versión soportada, con `.nvmrc` (contenido: `20`) apuntando a la versión mínima recomendada y `package.json#engines` con pin **relajado**: `{ "node": ">=20.0.0", "npm": ">=10.0.0" }`. Lockfile commiteado: `package-lock.json`.
**Por qué:**
1. **Máxima portabilidad sin instalar nada extra** — npm viene con Node, el evaluador no necesita habilitar corepack ni instalar pnpm/bun.
2. **Node 20+ relajado** — Node 20 (Active LTS hasta 2026-04), 22 (LTS) y 24 (Current) son todas compatibles con Vite 5/Tailwind 3/Vitest. Pin estricto `<21` bloqueaba sin razón a evaluadores con versiones más nuevas (mi máquina ya corre Node 24.13).
3. **`.nvmrc` apunta a 20** como **piso recomendado** para quien use `nvm`, sin rechazar versiones superiores.

**Refinamiento (2026-05-08, pre-scaffold):** la decisión inicial pinaba `>=20.0.0 <21.0.0`. Se detectó Node 24.13 en la máquina de desarrollo y se relajó el upper bound. Trade-off: se pierde el mensaje "use exactamente Node 20" (poco accionable de todos modos) y se gana compatibilidad con Node 22/24 sin reabrir la decisión.
**Alternativas consideradas:**
- *pnpm 9.* **Pro:** instalación 2-3× más rápida, mejor disk usage, workspaces sólidos. **Contra:** exige `corepack enable` o `npm i -g pnpm` en la máquina del evaluador, fricción innecesaria para un proyecto de un solo paquete.
- *Bun 1.x.* **Pro:** instalación instantánea, runner integrado. **Contra:** soporte de Windows aún con rough edges (paths nativos, lockfile no estable entre versiones), riesgo no justificado en un entregable.
- *Yarn classic / Yarn berry.* **Pro:** estable. **Contra:** ya no aporta nada que npm 10 no tenga; añade un binario más; berry con PnP rompe DX en muchos editores.
- *No pinear Node.* **Pro:** menos archivos. **Contra:** abre la puerta a "no instala dependencia X en Node 18", riesgo gratuito.
**Lo que se deja de lado:** velocidad de instalación de pnpm/bun (mitigación: las dependencias declaradas son pocas; con npm el `install` ronda los 30-60s, dentro del SLA de 2 min).
**Impacto:** README documenta requisitos ("Node 20 LTS, npm 10"); §3.1/3.2 NF reflejan el flujo `npm`; scripts `package.json` se nombran asumiendo npm. Ningún ADR cambia (queda dentro de ADR-01 / ADR-20).
**Reversibilidad:** **alta.** Cambiar a pnpm/bun en V2 son 2 archivos: regenerar lockfile + ajustar scripts si difieren.

#### DEV-04 · 2026-05-08 · [data][devx] Validación del JSON a mano, sin zod ni runtime schema
**Contexto:** la capa `load.ts` necesita validar que `metrics.json` tiene la forma esperada antes de indexarlo. La pregunta era: ¿runtime schema (zod / valibot / arktype) vs validación liviana a mano?
**Decisión:** validación a mano dentro de `loadMetrics()`. Solo chequear: las 4 keys A/B/C/D existen, cada dataset tiene `metadata.metrics` (array no vacío) y `days` con la longitud declarada. Ante incumplimiento: `throw new Error(...)` con razón clara.
**Por qué:**
1. El JSON es **interno y bundleado en build** (M1 §10); su estructura es conocida y estable, no entra desde un endpoint externo no confiable.
2. zod añade ~12 KB gz al bundle inicial — para un proyecto con presupuesto de 150 KB es 8 % gratis.
3. A TS strict le bastan los tipos canónicos de §5.1 + el narrow inicial.
**Alternativas consideradas:**
- *zod.* **Pro:** schema declarativo, mensajes de error excelentes, parsing y typing simultáneos. **Contra:** ~12 KB gz, una dependencia más en supply chain (ADR-relacionado §10), DX que no se va a usar (no hay formularios ni APIs externas).
- *valibot.* **Pro:** ~3 KB gz, modular. **Contra:** misma idea, menor ecosistema, igual añade dependencia.
- *Type assertion (`as Metrics`).* **Pro:** cero código. **Contra:** viola §5.10 invariante 5 (toda agregación expone cobertura); si el JSON cambia silenciosamente la app rompe en runtime sin pista.
**Lo que se deja de lado:** errores explicativos automáticos a nivel de propiedad (zod te dice exactamente qué campo falla). Mitigación: el validador a mano produce mensajes específicos por chequeo (`"dataset A: metadata.metrics is empty"`).
**Impacto:** `src/data/load.ts` implementa la validación. Ningún ADR cambia. Si en V2 se conectara una API externa, esta decisión se revisa.
**Reversibilidad:** **alta.** Reemplazar `loadMetrics` por una versión con zod son 30 minutos.

#### DEV-05 · 2026-05-08 · [data][perf] Modelo indexado con `Float64Array` (NaN para nulls) + `Uint8Array` máscara
**Contexto:** ADR-07 fija "typed arrays + máscara de nulls" a alto nivel. La forma exacta del tipo y por qué `n` (cantidad de días con dato) se precomputa eran detalles que merecían documentación.
**Decisión:** la estructura interna por métrica es `{ values: Float64Array(N), mask: Uint8Array(N), n: number }` donde `N` = longitud del dataset (365). `null` en el JSON original se convierte a `NaN` en `values` y `0` en `mask`. `n` se precomputa al cargar (sum de mask). Conjunto en `IndexedDataset` con `dates: string[]` paralelo y `metrics: Record<MetricKey, IndexedMetric>`.
**Por qué:**
1. **Performance** — sumar 365 floats con `for(let i=0; i<n; i++) acc += mask[i] ? values[i] : 0` es ~8× más rápido que iterar arrays de objetos.
2. **Correctitud** — la máscara hace explícita la diferencia entre "valor cero" y "sin dato"; nunca se confunden en cálculos.
3. **Cache de cobertura** — `n` precomputado evita recorrer la máscara cada vez que se quiere saber cuántos días contribuyeron a un agregado (necesario para mostrar "n/N días con dato" en UI, §5.5).
**Alternativas consideradas:**
- *Array de números nullable (`(number | null)[]`).* **Pro:** representación natural. **Contra:** 8× más lento en sumas; cada acceso es polimórfico; no aprovecha SIMD del motor.
- *Map por fecha (`Map<string, number>`).* **Pro:** lookup directo por fecha. **Contra:** irrelevante: el acceso es siempre por índice de día contiguo en una ventana, no por fecha; iterar `Map` es lento.
- *Sentinela como `-1` o `Number.MIN_SAFE_INTEGER` en lugar de máscara.* **Pro:** un solo array. **Contra:** choca con métricas que pueden ser legítimamente negativas en el futuro; mezcla "ausencia" con "valor", patrón frágil. NaN sí funciona, pero con la máscara separada los chequeos son `if (mask[i])` (1 instrucción) en vez de `if (!isNaN(values[i]))` (más caro y propenso a sorpresas).
**Lo que se deja de lado:** sencillez de un array plano de objetos `{ date, value }` (mitigación: `IndexedDataset` se construye una vez por dataset y se cachea; el resto del código habla con la API limpia de `aggregations.ts`, no con los typed arrays directamente). También se sacrifica un poco de overhead de memoria por la máscara separada (~365 bytes por métrica × 11 = 4 KB por dataset × 4 = 16 KB total — irrelevante).
**Impacto:** `src/data/schema.ts` define `IndexedMetric` y `IndexedDataset`. `src/data/transform.ts` implementa `indexDataset`. Refuerza ADR-07 con el detalle de implementación. ADR-18 (tolerancia a nulls aunque V1 no los traiga) sigue vigente: la máscara siempre está, aunque siempre sea todo 1s.
**Reversibilidad:** media. Cambiar la representación interna obliga a tocar `transform.ts` y `aggregations.ts`. La superficie pública (firmas de `sum`, `weightedAvg`, etc.) se puede mantener para no propagar el cambio al resto de la app.

#### DEV-06 · 2026-05-08 · [ux][devx] Persistencia split: URL para estado compartible, localStorage para preferencia personal
**Contexto:** la app tiene tres piezas de estado persistible: dataset activo (A/B/C/D), ventana temporal (7d/30d/90d/MTD/QTD/365d), tema (light/dark/system). Hay que decidir dónde vive cada una entre URL y localStorage.
**Decisión:** **URL** lleva `ds` y `range` (vía `URLSearchParams` y `history.replaceState`). **localStorage** (clave `palvi-prefs-v1`) lleva las tres: dataset, range, theme — pero solo el theme se considera autoritativo desde localStorage. La URL gana sobre localStorage al hidratar (regla `defaults < localStorage < URL`).
**Por qué:**
1. **Compartir contexto, no preferencia** — un link `?ds=B&range=90d` debe llevar al receptor a la misma vista; pero forzarle el tema del emisor es invasivo y rompe `prefers-color-scheme`.
2. **Vuelta-a-vuelta del usuario** — al volver mañana, el dataset y la ventana usados ayer se restauran si la URL no los trae, gracias al espejo en localStorage.
3. **Sin router, sin librería extra** — `history.replaceState` no apila entries y se evita inundar el back button con cada cambio de filtro.
**Alternativas consideradas:**
- *Todo en URL (incluyendo theme).* **Pro:** estado totalmente reproducible. **Contra:** forzar tema vía link es ruido visual al receptor; viola la "preferencia personal" del navegador.
- *Todo en localStorage, nada en URL.* **Pro:** simple. **Contra:** imposible compartir un link con dataset/ventana específicos (uno de los CTAs de §6.7).
- *Cookies.* **Pro:** viajan al backend. **Contra:** V1 no tiene backend; introducen consideraciones GDPR sin necesidad.
- *URL hash (`#ds=A`)* en vez de query string. **Pro:** no afecta cache HTTP (irrelevante en V1 local). **Contra:** convención menos esperada para estado de filtros; UX inferior al copiar/pegar.
**Lo que se deja de lado:** historial navegable de cambios de filtro (con `pushState` cada cambio quedaría en el back button). Mitigación intencional: para un dashboard ejecutivo el back button para revertir filtros es fricción, no feature.
**Impacto:** `src/store/persistence.ts` implementa `readURL`, `writeURL`, `readLocalStorage`, `writeLocalStorage`, `loadInitialState`. `useAppStore` los usa en cada setter. Refuerza SDD §6.4, §7.3 y ADR-16. Ningún ADR cambia.
**Reversibilidad:** alta. Cambiar la regla de prioridad o mover el theme a URL son cambios localizados a `loadInitialState` y los setters.

#### DEV-07 · 2026-05-08 · [ui][perf] `cn()` casero en lugar de `clsx` / `tailwind-merge` / `cva`
**Contexto:** los componentes UI necesitan combinar clases Tailwind condicionalmente (`isActive ? "bg-surface" : "text-text-muted"`). El patrón industria es importar `clsx` (y opcionalmente `tailwind-merge` para resolver conflictos).
**Decisión:** un helper local `src/utils/cn.ts` de 5 líneas:
```ts
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
```
Sin merge inteligente. Si dos clases compiten (`p-4` y `p-6`), gana el orden de declaración Tailwind, que el caller controla.
**Por qué:**
1. **Bundle:** `clsx` solo son ~250 bytes, pero `tailwind-merge` son ~6 KB gz. Para 6-8 componentes con clases simples, no hace falta resolver conflictos en runtime.
2. **Cero dependencias adicionales** — alineado con la política de §10.4 SHOULD S2 (cada `npm install` se justifica).
3. **API mínima** — el equipo no necesita aprender la sintaxis de objetos de clsx ni los matices de cva; un array filtrado funciona para todos los casos.
**Alternativas consideradas:**
- *clsx (~250 B gz).* **Pro:** API rica (objetos, arrays anidados), estándar de facto. **Contra:** añade dependencia para algo que cabe en 5 líneas.
- *clsx + tailwind-merge (~6 KB gz).* **Pro:** resuelve conflictos `p-4 p-6` automáticamente. **Contra:** 4 % del budget de 150 KB gz para un beneficio marginal; el caller puede ordenar las clases.
- *cva (~3 KB gz).* **Pro:** variants tipadas, ergonómico para componentes con muchos estados. **Contra:** nuestros componentes (Card, Badge, Skeleton, SegmentedControl) tienen 1-2 ejes de variación; la abstracción no se amortiza.
- *Inline ternarios sin helper.* **Pro:** cero código extra. **Contra:** legibilidad cae con 3+ clases condicionales; obliga a string interpolation propensa a espacios duplicados.
**Lo que se deja de lado:** ergonomía de objetos (`cn({ "bg-x": isActive })`) y resolución automática de conflictos. Trade-off aceptado: una convención de equipo (siempre poner las clases override al final) cubre el 100 % de los casos en V1.
**Impacto:** todos los componentes en `src/components/ui/` y `src/components/header/` usan `cn`. Si en V2 aparecen componentes con muchas variantes, considerar migración a `cva` (decisión re-evaluable). Ningún ADR cambia.
**Reversibilidad:** alta. Reemplazar `cn` por `clsx` es un find-and-replace; añadir `tailwind-merge` requiere envolver `cn` y queda transparente al resto del código.

#### DEV-08 · 2026-05-08 · [ui][perf] Sparkline implementado con SVG inline puro, sin Recharts
**Contexto:** los 6 KPI cards llevan cada uno una sparkline 30d (SDD §8.6). La opción industria es usar Recharts (ya en dependencias) o algo similar. La pregunta era si vale la pena traerlo para una tarea visual mínima.
**Decisión:** `src/components/kpi/Sparkline.tsx` es un componente custom de ~80 líneas que renderiza un SVG inline con dos pasadas: una por la línea (rompe el path con `M` cuando aparece NaN — gap visible) y otra por el área (agrupa runs contiguos de puntos válidos y cierra cada uno al baseline). ViewBox `0 0 100 height` con `preserveAspectRatio="none"` y `vectorEffect="non-scaling-stroke"`.
**Por qué:** (1) **bundle** — Recharts cargado para sparklines pintaría +95 KB gz cuando todavía no hay charts grandes; mejor diferirlo a Fase 4/5 cuando entre el chart 90d del drill-down. (2) **Control de gaps** — el SDD §5.5 exige que la línea se rompa en null; con SVG puro es 1 condición; con Recharts hay que conocer la prop `connectNulls={false}` y verificar que los nulls no se interpolen. (3) **Performance** — 6 sparklines × 30 puntos × DOM react-managed pesa más que 6 SVG estáticos.
**Alternativas consideradas:**
- *Recharts `<LineChart>` con altura 36.* Pro: API conocida, props para áreas y dots. Contra: trae todo Recharts al chunk inicial; overkill para 30 puntos sin tooltip ni ejes.
- *uPlot (canvas).* Pro: más rápido en miles de puntos. Contra: 30 puntos no justifican canvas; el coste de inicializar uPlot en cada KPI card es mayor que renderizar SVG estático.
- *visx primitives (`@visx/sparkline`).* Pro: tree-shakeable, 5-10 KB. Contra: 5-10 KB para algo que cabe en 80 líneas; introduce concepto "scale factories" sin necesidad.
**Lo que se deja de lado:** tooltip al hover (no se especificó en mobile-first, §8.6: "sin tooltip en mobile"), ejes (no aplica), animación de entrada (intencional — animaciones &lt;250 ms del SDD §8.8 se quedan en transiciones, no en mount). Si Fase 5 pide hover state en el sparkline, migrar a Recharts.
**Impacto:** `src/components/kpi/Sparkline.tsx` self-contained. Recharts queda como dependencia para el chart 90d del Modal de drill-down (Fase 4/5). Refuerza ADR-04 (decisión "Recharts (V1) → uPlot si Lighthouse cae" sigue, pero solo se carga cuando hace falta charts grandes).
**Reversibilidad:** alta. Si aparece la necesidad de hover/tooltip, reemplazar el componente por un wrapper de Recharts es 30 líneas y la API pública (`{ data, height, ariaLabel, tone }`) se preserva.

#### DEV-09 · 2026-05-08 · [data][perf] `useIndexedMetrics` como singleton de módulo, sin Suspense ni React Query
**Contexto:** `metrics.json` se importa como módulo ESM (Vite lo bundlea). Hay que decidir cómo se expone al árbol React: (a) cargar dentro de un componente con efecto, (b) Suspense + Promise, (c) React Query, (d) singleton de módulo.
**Decisión:** `src/hooks/useIndexedMetrics.ts` cachea el resultado de `indexAll(loadMetrics())` en una variable `let` de módulo. La primera invocación construye los `IndexedDataset`; las siguientes retornan el mismo objeto. El hook simplemente devuelve el cache. No hay estado de loading; no hay error boundary.
**Por qué:** (1) **el JSON ya está en el bundle** — para cuando el JS corre, los datos están en memoria; modelar "loading" sería mentira. (2) **Costo de indexar** — `indexAll` recorre 4 × 365 × 11 ≈ 16 k iteraciones, &lt;5 ms en cualquier dispositivo; lo hacemos una vez al primer render y nadie lo nota. (3) **Cero dependencias nuevas** — React Query (~12 KB gz) o SWR (~4 KB gz) son para fetching async con cache + revalidation; sobreingeniería para datos estáticos.
**Alternativas consideradas:**
- *`useMemo` dentro de un Provider.* Pro: idiomático React. Contra: si el Provider está alto en el árbol y otro hook lo invoca antes de mount, se reconstruye. El singleton es más simple.
- *React Query con `queryKey: ["metrics"]` y `queryFn` que retorna el JSON estático.* Pro: API uniforme con futuras llamadas a backend (V2). Contra: 12 KB gz para algo que es un import síncrono; el patrón "queryFn que retorna inmediatamente" es contradictorio.
- *Suspense + un Promise resuelto al cargar.* Pro: UX "loading skeleton" automática. Contra: el JSON no carga async — el skeleton sería de 0 ms y lo habríamos puesto solo para la prop estética.
- *Carga lazy con `import("./metrics.json")` y un estado de loading real.* Pro: podría reducir el chunk inicial. Contra: el JSON termina cargándose igual antes del primer KPI render; el "loading skeleton" se vería 50 ms y empeoraría la experiencia (CLS, fricción).
**Lo que se deja de lado:** estado de loading visible (no hace falta), reactividad ante cambios del JSON (es inmutable), revalidación periódica (V1 no tiene refetch). Trade-off aceptado: si V2 conecta un backend real, este hook se reemplaza por uno con fetch + cache; el resto del código (`useKPIs`, `useFunnel`, etc.) consume `IndexedMetrics` y no se entera.
**Impacto:** `src/hooks/useIndexedMetrics.ts`. Refuerza ADR-07 (typed arrays + máscara) y ADR-15 (no backend en V1). El patrón "el dato está disponible síncronamente" es la base sobre la que se construyen `useKPIs`, `useFunnel` y futuros hooks de datos.
**Reversibilidad:** alta. Migrar a fetch async + Suspense requiere envolver el árbol con `<Suspense>` y cambiar `loadMetrics` por una promise. La forma del cache permanece.

#### DEV-10 · 2026-05-08 · [data] Funnel baseline = ventana prior de igual longitud, no "30d fijo"
- **Contexto:** SDD §6.4 menciona "delta vs baseline 30d" para los pasos del funnel. La implementación de `useFunnel` calcula el delta de conversión vs la **ventana prior de igual longitud** (si la ventana actual es 7d, prior es los 7 días anteriores; si es QTD, prior es el QTD anterior). Esto diverge ligeramente de la lectura literal de la spec.
- **Decisión:** mantener "ventana prior de igual longitud". El SDD §6.4 se reinterpreta para alinearse con el resto del sistema.
- **Por qué:** (1) **coherencia con KPIs** — los 6 KPI cards comparan vs prior period de igual longitud (`useKPIs`); que el funnel use otra regla creaba inconsistencia y obligaba al usuario a internalizar dos mentales models distintos. (2) **Direction-aware homogéneo** — la función `directionAwareSign` recibe deltas relativos sin importar la fuente; un baseline distinto para el funnel forzaría una rama especial. (3) **Sensibilidad a la ventana** — si el usuario selecciona 7d en el header, comparar contra "30d fijo" hace que el delta del funnel oculte el efecto de la elección.
- **Alternativas consideradas:**
  - *Baseline 30d fijo independiente de la ventana actual.* Pro: estabilidad estadística (más volumen para tasas de conversión). Contra: rompe la coherencia con KPIs y desconecta el funnel del filtro temporal del usuario.
  - *Baseline configurable (toggle "vs período anterior" / "vs últimos 30d").* Pro: flexibilidad. Contra: complejidad de UI sin demanda real; un toggle más para algo que el usuario no pidió.
  - *Doble overlay (mostrar ambos deltas).* Pro: información rica. Contra: ruido visual; el funnel debe resaltar UN cuello, no presentar dos comparaciones.
- **Lo que se deja de lado:** la robustez estadística de un baseline fijo más largo (mitigación: la ventana default es 30d, así que el caso típico ya tiene volumen suficiente). El SDD §6.4 quedará marcado para actualizar la línea "vs baseline 30d" → "vs ventana prior" en la próxima revisión del documento.
- **Impacto:** `src/hooks/useFunnel.ts` implementa la regla. Refuerza la coherencia con DEV-05 y `useKPIs`. Ningún ADR cambia.
- **Reversibilidad:** alta. Cambiar a baseline 30d fijo son ~5 líneas en `useFunnel.ts` (calcular `windowIndicesByDate` con "30d" en paralelo a la ventana actual).

#### DEV-11 · 2026-05-08 · [perf][ui] `CustomerHealthCard` con `React.lazy + Suspense` para sacar Recharts del chunk inicial
- **Contexto:** Recharts (~95 KB gz) entró al bundle al implementar el dual-axis chart de la Customer Health card. El chunk inicial pasó de 98 KB gz a 213 KB gz, superando el budget de 150 KB gz declarado en SDD §9.6.
- **Decisión:** envolver `CustomerHealthCard` en `React.lazy(() => import("@/components/health"))` + `<Suspense fallback={<Skeleton variant="rect" className="h-80 w-full" />}>`. El componente y todo Recharts se mueven a un chunk async que carga después del primer paint.
- **Por qué:** (1) **cumplimiento del budget** — chunk inicial vuelve a 112 KB gz, dentro del SLA. (2) **First paint priorizado** — KPIs hero y funnel (lo que el Jefe de Ventas necesita en sus primeros 30 segundos) renderizan sin esperar a Recharts. (3) **Patrón replicable** — el chart 90d del drill-down (Fase 5/6) sigue el mismo enfoque: Recharts ya está en el chunk async, su segunda invocación no recarga.
- **Alternativas consideradas:**
  - *`manualChunks` en Vite config separando Recharts en su propio chunk.* Pro: cero refactor en componentes. Contra: el chunk se sigue cargando en el path crítico (es un `<script>` paralelo, no async); el FCP no mejora realmente.
  - *Migrar la card a uPlot (canvas).* Pro: ~45 KB vs 95 KB. Contra: API distinta, requiere wrappers para React, riesgo de bugs en el primer chart "real" del proyecto. Reservado a §13 si Recharts no escala.
  - *Eliminar la dual-axis chart en V1.* Pro: máximo ahorro de bundle. Contra: §6.5 lo pide explícitamente; sacarlo degrada la lectura de salud del cliente.
  - *No diferir, aumentar el budget.* Pro: simplicidad. Contra: el SDD §9.6 fija 150 KB gz por una razón (FCP &lt;1 s en mobile); subir el budget sin justificación rompe ADR-04 y la promesa del SDD.
- **Lo que se deja de lado:** el primer render mostrará un skeleton ~50-150 ms hasta que Recharts cargue (mitigación: el skeleton ocupa el mismo espacio, no hay CLS; en localhost los chunks async tardan &lt;30 ms; en V2 hostead se podría preload con `<link rel="modulepreload">`). También se acepta una llamada extra al cache HTTP.
- **Impacto:** `src/App.tsx` usa `lazy` + `Suspense`. Refuerza ADR-04 (Recharts V1 con plan de migración) y SDD §9.4 ("Cargado con `import()` dinámico **después** del primer paint de KPIs"). Establece el patrón para futuros componentes con dependencias pesadas (chart 90d del drill-down, posibles vistas de detalle).
- **Reversibilidad:** alta. Quitar el split son 2 líneas (volver a `import { CustomerHealthCard } from ...` y eliminar el `<Suspense>`).

#### DEV-12 · 2026-05-08 · [data] Regla `lead_drought` normaliza el baseline 90d a 30d equivalentes
- **Contexto:** SDD §6.3 define la regla *Lead drought* como `leads_qualified_30d` cae &gt;25 % vs **baseline 90d**. Implementada literalmente, comparar `sum(30d)` contra `sum(90d)` siempre dispararía la alerta porque la suma de 90 días es mecánicamente ~3× la de 30. La regla, leída textualmente, es estadísticamente incorrecta.
- **Decisión:** `src/data/insights.ts` calcula el baseline como `sum_leads_qualified_90d / 3` — la "tasa diaria promedio del baseline 90d" reescalada a una ventana 30d equivalente. La condición se evalúa como `(current_30d - baseline_norm) / baseline_norm < -0.25`, donde `baseline_norm = sum_90d / 3`.
- **Por qué:** (1) **corrección estadística** — comparar volúmenes de períodos de distinta duración requiere normalización; sin ella, la regla es ruido garantizado. (2) **alineación con la intención del SDD** — la regla quiere detectar "menos leads calificados últimamente que la tendencia de 3 meses", no "ha pasado menos tiempo en 30 días que en 90". (3) **paralelismo con `funnel_choke`/`funnel_breakthrough`** — esas reglas comparan tasas (suma/suma), no volúmenes; lead_drought se trata como volumen reescalado para mantener el espíritu.
- **Alternativas consideradas:**
  - *Comparar `current_30d` vs `prior_30d`.* Pro: simétrico con el resto de reglas. Contra: ventana corta — un mal mes lleva al falso positivo; el SDD pide explícitamente baseline largo para esta señal.
  - *Comparar promedio diario `current_30d / 30` vs `baseline_90d / 90`.* Pro: matemáticamente equivalente al enfoque elegido. Contra: el delta relativo es el mismo, así que es solo cosmética; preferí `sum_90d / 3` por claridad de "esta es una ventana 30d virtual".
  - *Implementar literal `sum_30d / sum_90d` y ajustar el umbral de -25 % a algo como -67 %.* Pro: respeta la spec letra por letra. Contra: el umbral pierde significado interpretable; cualquier persona leyendo el código tiene que recalcular qué representa.
  - *Cambiar la regla a baseline 30d (prior 30d).* Pro: simple. Contra: cambia el espíritu de la spec — perdemos la señal de tendencia trimestral.
- **Lo que se deja de lado:** la lectura literal de la spec (mitigación: SDD §6.3 quedará marcado como aclaración pendiente — la próxima iteración del documento debe decir explícitamente "vs `sum_baseline_90d / 3`" para evitar reabrir la decisión). También se acepta que normalizar oculta efectos de estacionalidad fuerte en los 90 días previos, pero esa es la intención: queremos comparar contra la tendencia, no contra un mes específico.
- **Impacto:** `src/data/insights.ts`. Refuerza ADR-11 (alertas relativas a baseline propio) y SDD §5 invariantes 3 (tasas de período = suma/suma) — aquí se aplica la misma normalización a una "tasa de leads calificados por día".
- **Reversibilidad:** alta. Cambiar el divisor o eliminar la normalización son 2 líneas en `insights.ts`.

#### DEV-13 · 2026-05-08 · [a11y][ui] Focus trap manual en `BottomSheet`, sin `react-focus-lock` ni `radix-ui`
> **Nota posterior (DEV-14):** el componente fue renombrado a `Modal` (centrado) más adelante. Toda la decisión sobre focus trap manual sigue vigente — solo cambia la forma de la ventana, no su comportamiento accesible.

- **Contexto:** el `BottomSheet` debe ser accesible: cuando está abierto, el foco no debe escapar al contenido detrás (focus trap), y al cerrarse el foco debe volver al elemento que lo abrió. Esto es un requisito típico de un `dialog` modal y suele resolverse con `react-focus-lock` (~10 KB gz), `radix-ui/react-dialog` (~25 KB gz) o headless UI. La pregunta era si traer una librería o implementarlo a mano.
- **Decisión:** implementación manual en `src/components/ui/BottomSheet.tsx` con ~20 líneas: (1) `useRef` al elemento panel; (2) `useEffect` que al abrir captura `document.activeElement` y mueve foco al primer focusable dentro; (3) listener `keydown` global que intercepta `Tab`/`Shift+Tab` para circularlo dentro del panel; (4) cleanup que restaura el foco al elemento previo. Plus `body { overflow: hidden }` para scroll lock y `role="dialog" aria-modal="true"` para el aria contract.
- **Por qué:** (1) **bundle** — ningún componente del proyecto necesita un sistema de overlays más complejo que un solo BottomSheet; pagar 10-25 KB gz por una librería para 20 líneas no se justifica con el budget de 150 KB gz (DEV-11). (2) **Cero dependencias adicionales** — política de §10.4 SHOULD S2 (cada `npm install` se justifica). (3) **Control del comportamiento** — el focus trap tiene casos sutiles (qué pasa cuando el primer focusable está deshabilitado, cómo se comporta el restore focus si el elemento original ya no existe en el DOM). Implementarlo a mano deja claras las decisiones; con librería se heredan opiniones que pueden no calzar.
- **Alternativas consideradas:**
  - *`react-focus-lock` (~10 KB gz).* Pro: bien mantenido, edge cases cubiertos (iframe, portal, nested traps). Contra: 10 KB para un solo trap; convierte el componente en un wrapper de su API.
  - *`@radix-ui/react-dialog` (~25 KB gz).* Pro: dialog completo con animaciones, primitivas accesibles, portal. Contra: 25 KB es 17 % del budget; el `BottomSheet` es deliberadamente custom para soportar layout mobile-first (panel inferior con drag handle vs side panel desktop) que radix dialog no resuelve por defecto.
  - *Headless UI (`@headlessui/react`).* Pro: integrado con Tailwind, dialog accesible. Contra: 17-20 KB gz; el "Dialog" de Headless UI es modal con `Transition` propio — más maquinaria que la que necesita una sola pantalla.
  - *No implementar focus trap.* Pro: cero código. Contra: viola SDD §7.7 (accesibilidad), bloqueante para WCAG AA.
- **Lo que se deja de lado:** robustez ante casos exóticos (modales anidados, foco en iframes, portales fuera del root). Mitigación: el proyecto V1 tiene un único modal a la vez (`BottomSheet` del drill-down de KPI), no anida nada, y no usa iframes. Si V2 introduce más overlays simultáneos, la decisión se reabre y migrar a `react-focus-lock` es directo (envolver children con `<FocusLock>`).
- **Impacto:** `src/components/ui/BottomSheet.tsx`. Refuerza ADR-04 (presupuesto bajo) y la promesa de §10.4 SHOULD S2 (sin deps innecesarias). El patrón "dialog accesible custom" queda documentado para futuros overlays.
- **Reversibilidad:** alta. Migrar a `react-focus-lock` son ~5 líneas: `npm install react-focus-lock`, envolver `children` con `<FocusLock>`, eliminar el `useEffect` de Tab handling.

#### DEV-14 · 2026-05-08 · [ui][ux] Drill-down como `Modal` centrado (renombrado desde `BottomSheet`) y tooltip de chart en panel fijo arriba
- **Contexto:** durante revisión visual del usuario surgieron dos problemas: (1) el drill-down se abría como bottom sheet (mobile) / side panel (desktop) — el usuario lo prefirió como **modal centrado clásico** con el argumento de que "después de todo es un focus" y un modal centrado comunica eso mejor; (2) el tooltip default de Recharts en los charts (CustomerHealthCard dual-axis y Chart90 del drill-down) flotaba sobre las barras siguiendo el cursor, **se solapaba con los datos** y tenía contraste insuficiente para leer cómodo.
- **Decisión:**
  1. Renombrar `src/components/ui/BottomSheet.tsx` → `src/components/ui/Modal.tsx`. Layout: contenedor `fixed inset-0 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm` con un panel `bg-surface rounded-xl border border-border shadow-xl max-w-2xl max-h-[90vh] overflow-y-auto`. Animación `scale-95 → 1.0` + opacity, 200 ms `ease-out-expo`. Drag handle eliminado. Backdrop más prominente (`/50` + blur) para que el modal "flote" claramente.
  2. Reemplazar el `<Tooltip content={CustomTooltip} />` de Recharts en ambos charts por `<Tooltip content={() => null} />` + un panel HTML propio absoluto en `top-2 left-1/2 -translate-x-1/2`, controlado por estado local (`hover` actualizado en `onMouseMove`/`onMouseLeave` del chart). Background sólido `bg-surface`, border `border-border-strong`, fade 150 ms `pointer-events-none`. Recharts sigue dibujando el cursor (línea/banda vertical) sobre el dato hovered.
- **Por qué:**
  1. **Coherencia conceptual modal=foco.** Un drill-down es una operación de "inspección detallada"; un modal centrado es el patrón universal para esa intención (Linear, Stripe, Vercel todos lo usan así para detalle). Bottom sheet/side panel sugiere "vista secundaria persistente", que no es lo que hace este componente.
  2. **Tooltip fijo arriba elimina la oclusión.** El tooltip que sigue al cursor tapa los datos justo cuando se intenta leerlos; un panel arriba al centro deja libre el área del chart y el ojo se acostumbra a una sola posición de lectura.
  3. **Mejor contraste.** El tooltip default de Recharts es semitransparente; el panel custom usa `bg-surface` sólido + `border-border-strong` (más prominente que `border-border`), legible en ambos modos de tema.
  4. **Una sola posición fija reduce ruido visual.** No hay reposicionamiento del tooltip al mover el cursor — el ojo no persigue.
- **Alternativas consideradas:**
  - *Mantener bottom sheet con drag-to-dismiss completo + snap points.* Pro: idiomático mobile-first. Contra: el usuario lo evaluó y prefirió modal centrado; implementar drag/snaps requería gesture handling sin librería (~80 líneas) que ya no aporta a la decisión.
  - *Tooltip default con `position={{ x: 0, y: 0 }}` (Recharts).* Pro: cero código adicional. Contra: la posición se interpreta en coordenadas del SVG, no del container; sigue requiriendo cálculo manual y el contraste sigue mal.
  - *Mover el tooltip default a `wrapperStyle={{ top: 0, left: '50%' }}`.* Pro: usar la API existente. Contra: Recharts inserta su propio markup con clases internas no fácilmente customizables; reemplazarlo por contenido propio fue más limpio.
  - *Tooltip oculto del todo, mostrar info en una "data shelf" debajo del chart.* Pro: no obstruye nunca. Contra: aleja la información del lugar donde el ojo está mirando; requiere desplazamiento atencional grande.
- **Lo que se deja de lado:**
  - **El nombre `BottomSheet` y la posibilidad de UX mobile-first específica** (drag-to-dismiss, snap points 50/90 %). Mitigación: el modal centrado con `max-h-[90vh] overflow-y-auto` cubre el caso de contenido alto en mobile sin requerir snaps.
  - **Tooltip que sigue al cursor con todas las series visibles**: si el chart tuviera 4-5 series, el panel fijo podría requerir más ancho; con 2 series (CustomerHealth) y 1 (Chart90) hay espacio sobrado.
  - **Animación de salida del modal**: cuando `open=false` retorna `null` sin animar la salida (el componente solo anima entrada). Aceptable para V1.
- **Impacto:**
  - `src/components/ui/Modal.tsx` (nuevo, reemplaza `BottomSheet.tsx` borrado).
  - `src/components/ui/index.ts` exporta `Modal`.
  - `src/App.tsx` usa `Modal` en lugar de `BottomSheet`.
  - `src/components/health/CustomerHealthCard.tsx` y `src/components/kpi/detail/Chart90.tsx` con panel hover propio.
  - DEV-13 anotado con nota posterior (el rename no invalida la decisión sobre focus trap).
  - SDD §4.2, §8.4, plan §12 actualizados con "Modal" en lugar de "BottomSheet".
  - README.md "Segunda iteración" actualizado.
- **Reversibilidad:** alta. Volver a bottom sheet/side panel son ~30 líneas de CSS en `Modal.tsx`. Volver al tooltip default de Recharts son ~10 líneas en cada chart (eliminar estado local, restaurar `<Tooltip content={CustomTooltip}>`).
