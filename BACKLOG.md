# Backlog

- **Confirmar entrega a clientes con ID "PE.xxx"** — el arreglo (campo `recipient`) está en producción desde el 2026-10-08; falta verlo funcionar con un cliente real (revisar logs el primer día de campaña).
- **Verificación del negocio en Meta rechazada** — conseguir el motivo exacto del rechazo en Meta Business Suite.
- **Mudar hosting a gratis (Render + Neon)** — antes del próximo cobro de Railway. Para pasar el historial hace falta acceso a la base (proxy público temporal o llave SSH). Respaldo HTML del 2026-10-15 en el escritorio.
- **Costo de IA** — bot en `claude-haiku-5-5` desde 2026-10-20. Revisar en console.anthropic.com → Usage que el gasto bajó, y poner un tope mensual en Billing.
- **Texto de la plantilla de escalación** — dice "responde para marcarlo como resuelto", pero ahora la respuesta se reenvía al cliente y se cierra con `/resuelto`. Corregir y re-aprobar en Meta.
- **Variable `DATABASE_PUBLIC_URL` en Railway** — tiene una contraseña pegada por error; borrarla.
