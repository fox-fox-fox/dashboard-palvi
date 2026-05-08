## El problema
El archivo `metrics.json` trae métricas diarias de una empresa B2B SaaS: tráfico, leads, deals, tiempos de respuesta, tickets de soporte, etc. El objetivo es construir una **aplicación web que sirva como reporte ejecutivo** de esas métricas.

Contexto de uso: el **Jefe de Ventas** abre esta página en la mañana. Tiene 5 minutos antes de su primera reunión. Su trabajo es **aumentar las ventas y mejorar la atención al cliente**, y necesita salir sabiendo dónde poner foco hoy.

**Importante:** `metrics.json` trae **4 datasets** (A, B, C, D) — misma estructura, comportamiento diferente. La app tiene que dejar al usuario navegar entre ellos y **responder correctamente a cada uno** — no solo al primero.

---

## El dataset
`metrics.json` tiene esta estructura — un objeto cuyas claves de primer nivel son los **datasets** (A, B, C, D), cada uno con su propia metadata y serie diaria:

```json
{
  "A": {
    "metadata": {
      "start_date": "2025-04-26",
      "end_date": "2026-04-25",
      "days": 365,
      "metrics": [
        {
          "key": "traffic",
          "label": "Daily visits",
          "unit": "visits",
          "direction": "higher_is_better",
          "description": "Unique visits to the public marketing site."
        }
        // ... resto de las métricas
      ]
    },
    "days": [
      {
        "date": "2025-04-26",
        "metrics": {
          "traffic": 1834,
          "leads_created": 12,
          // ... resto de las métricas
        }
      }
      // ... 365 días
    ]
  },
  "B": { /* misma forma */ },
  "C": { /* misma forma */ },
  "D": { /* misma forma */ }
}
```

Las 4 versiones comparten la misma lista de métricas en `metadata.metrics`. Cambia el comportamiento subyacente de los datos.

El campo `direction` indica si subir es bueno (`higher_is_better`) o malo (`lower_is_better`), tomalo en cuenta para las alertas.

Algunas métricas pueden venir como `null` en días puntuales (por ejemplo, `avg_response_time_min` cuando no hubo leads ese día). Considéralo.

---

## Glosario
Estos son los términos que aparecen en `metrics.json`:
- **Lead** — persona o empresa que mostró interés (llenó un formulario, agendó demo). `leads_created` cuenta los nuevos del día.
- **Lead calificado** — lead que ventas evaluó y considera prospecto real (fit, presupuesto, timing). `leads_qualified`.
- **Deal** — oportunidad de venta abierta sobre un lead calificado. `deals_created` cuenta nuevas en el día.
- **Deal ganado / perdido** — `deals_won` y `deals_lost` cuentan los deals que cerraron hoy con cada resultado.
- **Tiempo de respuesta** (`avg_response_time_min`) — minutos desde que llega un lead hasta el primer contacto del equipo de ventas. En B2B, respuestas lentas tumban la tasa de conversión.
- **Deal cycle** (`avg_deal_cycle_days`) — días entre apertura y cierre. Promedio sobre los deals que cerraron ese día.
- **Stale deal** (`stale_deals`) — deal abierto desde hace **más de 60 días** sin cerrar. Conteo al final del día.
- **Tasa de cierre / win rate** — fracción de deals cerrados que se ganaron, sobre una ventana: `sum(deals_won) / sum(deals_won + deals_lost)`. Métrica de período (qué cerró esta semana), no de cohorte (qué pasó con los deals abiertos en marzo).
- **Funnel / embudo** — tráfico -> leads -> leads calificados -> deals -> deals ganados. Cada paso tiene su tasa de conversión; un cuello en uno se nota aguas abajo.
- **Tickets de soporte** — `support_tickets_opened` cuenta los abiertos hoy; `support_avg_resolution_hours` es el promedio de horas para resolver los abiertos hoy.
