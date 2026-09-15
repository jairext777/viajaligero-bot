import { Router } from "express";
import type { Request, Response } from "express";
import { config } from "../config/env.js";
import { verifyMetaSignature } from "../whatsapp/signature.js";
import { handleWhatsAppWebhook } from "../whatsapp/handler.js";
import type { WhatsAppWebhookPayload } from "../whatsapp/webhook.types.js";
import { handleMessengerWebhook } from "../facebook/handler.js";
import type { MessengerWebhookPayload } from "../facebook/webhook.types.js";
import { handleInstagramWebhook } from "../instagram/handler.js";
import type { InstagramWebhookPayload } from "../instagram/webhook.types.js";
import { logger } from "../util/logger.js";

export const webhookRouter = Router();

// El mismo verify token y el mismo callback URL sirven para los tres productos
// (WhatsApp, Messenger, Instagram) — Meta unifica la configuración de webhooks a
// nivel de app; lo que cambia es el campo "object" del payload en el POST.
webhookRouter.get("/webhook/whatsapp", (req: Request, res: Response) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === config.META_VERIFY_TOKEN) {
    res.status(200).send(String(req.query["hub.challenge"] ?? ""));
    return;
  }
  res.sendStatus(403);
});

// Meta reintenta si no recibe el 200 a tiempo: se responde de inmediato y el
// procesamiento (que llama a Claude/Shopify/DB) corre después, sin bloquear el ack.
webhookRouter.post("/webhook/whatsapp", verifyMetaSignature, (req: Request, res: Response) => {
  res.sendStatus(200);
  handleIncomingWebhook(req.body).catch((err) => {
    logger.error(`Error procesando webhook entrante: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
  });
});

async function handleIncomingWebhook(payload: { object?: string }): Promise<void> {
  switch (payload.object) {
    case "whatsapp_business_account":
      await handleWhatsAppWebhook(payload as unknown as WhatsAppWebhookPayload);
      return;
    case "page":
      await handleMessengerWebhook(payload as unknown as MessengerWebhookPayload);
      return;
    case "instagram":
      await handleInstagramWebhook(payload as unknown as InstagramWebhookPayload);
      return;
    default:
      logger.warn(`Webhook con 'object' desconocido, se ignora: ${payload.object}`);
  }
}
