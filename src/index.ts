import { runMigrations } from "./db/migrate.js";
import { createApp } from "./server/app.js";
import { config } from "./config/env.js";
import { logger } from "./util/logger.js";
import { sweepStaleEscalations } from "./escalation/escalationService.js";

const AUTO_RESOLVE_SWEEP_INTERVAL_MS = 15 * 60 * 1000;

async function main(): Promise<void> {
  await runMigrations();

  const app = createApp();
  app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "Servidor escuchando");
  });

  setInterval(() => {
    sweepStaleEscalations().catch((err) => logger.error({ err }, "Error en el sweep de auto-resolución"));
  }, AUTO_RESOLVE_SWEEP_INTERVAL_MS);
}

main().catch((err) => {
  logger.error({ err }, "Error fatal al iniciar la aplicación");
  process.exit(1);
});
