import express from "express";
import type { Request, Response } from "express";
import { captureRawBody } from "./rawBody.js";
import { webhookRouter } from "../webhook/router.js";
import { inboxRouter } from "../inbox/router.js";
import { refreshCatalog } from "../shopify/catalogSync.js";
import { config } from "../config/env.js";
import { logger } from "../util/logger.js";

export function createApp() {
  const app = express();
  app.use(express.json({ verify: captureRawBody }));

  app.use(webhookRouter);
  app.use(inboxRouter);

  app.post("/internal/catalog/refresh", async (req: Request, res: Response) => {
    if (req.header("x-internal-secret") !== config.INTERNAL_ADMIN_SECRET) {
      res.sendStatus(401);
      return;
    }
    try {
      const text = await refreshCatalog();
      res.status(200).json({ ok: true, catalog: text });
    } catch (err) {
      logger.error({ err }, "Error refrescando el catálogo");
      res.status(500).json({ ok: false });
    }
  });

  app.get("/health", (_req: Request, res: Response) => res.sendStatus(200));

  return app;
}
