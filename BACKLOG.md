# Backlog

- **Verificación del negocio en Meta** — al 2026-10-24 el estado es `pending_submission` (ya no "rejected"): falta enviar los documentos (Ficha RUC) en Meta Business Suite. Límite actual: 250 conversaciones iniciadas por la empresa cada 24h.
- **Mudar hosting a gratis (Render + Neon)** — antes del próximo cobro de Railway. Para pasar el historial hace falta acceso a la base (proxy público temporal o llave SSH). Respaldo HTML del 2026-10-15 en el escritorio.
- **Costo de IA** — bot en `claude-haiku-5-5` desde 2026-10-20. Revisar en console.anthropic.com → Usage que el gasto bajó, y poner un tope mensual en Billing.
- **Texto de la plantilla de escalación** — dice "responde para marcarlo como resuelto", pero ahora la respuesta se reenvía al cliente y se cierra con `/resuelto`. Corregir y re-aprobar en Meta.
- **Variable `DATABASE_PUBLIC_URL` en Railway** — tiene una contraseña pegada por error; borrarla.
- **Fotos de la cuellera, las bolsas y el combo** — el dueño las mandará; agregarlas a `catalog.json` → `photos` y a `src/assets/products/`.
