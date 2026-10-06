import express from "express";
import type { Request, Response } from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { captureRawBody } from "./rawBody.js";
import { webhookRouter } from "../webhook/router.js";
import { inboxRouter } from "../inbox/router.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(express.json({ verify: captureRawBody }));
  app.use(express.urlencoded({ extended: true }));

  // Sirve imágenes propias (ej. el QR de Yape) para que WhatsApp/Messenger/Instagram
  // puedan descargarlas por URL pública al mandarlas como adjunto.
  app.use("/assets", express.static(join(__dirname, "../assets")));

  app.use(webhookRouter);
  app.use(inboxRouter);

  app.get("/health", (_req: Request, res: Response) => res.sendStatus(200));

  return app;
}
