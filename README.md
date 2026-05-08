# Dashboard PALVI

Reporte ejecutivo B2B SaaS sobre `metrics.json`, mobile-first y de ejecución local.

## Cómo correrlo localmente

Requiere Node 20+ y npm 10+.

```bash
npm install && npm run dev
```

## Decisiones técnicas

- **Stack: Vite + React 18 + TS strict + Tailwind + Zustand + Recharts (lazy) + Vitest.** Stack compacto y sin sorpresas.
- **Datos indexados con `Float64Array` + máscara de nulls.** Sumas rápidas y los nulls no se confunden con ceros.
- **Insights con baseline propio del dataset.** Así cada uno cuenta su historia sin tunear umbrales a mano.
- **Estado en URL (`?ds=A&range=30d`).** Para que un link reproduzca la vista. El tema queda en localStorage porque es preferencia personal.
- **Sparkline custom en SVG.** Recharts era exagerado para 30 puntos; lo dejé para el chart grande del drill-down.
- **Mobile-first, dark mode, accesible.** Donde más se usa el dashboard, lo que mucha gente prefiere, y porque desde el inicio cuesta poco.
- **Sin backend.** Es un dashboard sobre un JSON estático. Meter backend era buscar problemas que no había.

## Segunda iteración

- **Despliegue cloud con auth y headers de seguridad.** El alcance era local. Antes de publicar con datos reales hay que decidir auth y CSP.
- **Snap points y drag en el modal de detalle.** El modal centrado ya es accesible. Los gestures mobile no agregan mucho valor ahora mismo.
- **Anotaciones manuales en días específicos** (campañas, releases). Útil pero requiere persistencia. Es otro feature, no un retoque.
- **Comparador multi-dataset side-by-side.** Hoy se cambia uno por vez. Antes de duplicar el layout, prefiero validar si alguien lo pide.
- **Exportación CSV/PNG.** El JSON ya es la fuente y los links se comparten. No le veo prioridad.
- **Migración a uPlot.** Recharts entra en el budget. Cambiar implica reescribir tres charts. Solo si Lighthouse cae.
- **Tests visuales** (Playwright o Storybook). Los 46 tests de lógica cubren la respuesta a los 4 datasets, que es lo central. Los visuales tienen sentido cuando el equipo crece.
- **Configurador de umbrales de alerta.** Las reglas están calibradas para los datasets de prueba. Tiene sentido cuando entren datos reales con estacionalidad propia.
- **Ingesta real desde CRM** (HubSpot/Salesforce). La capa indexada ya está aislada; falta el conector real (OAuth, mapeo de campos, sync), que es trabajo aparte.

Más detalle vivo en [`SDD.md`](./SDD.md).
