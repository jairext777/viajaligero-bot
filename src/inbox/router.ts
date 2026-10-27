import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config/env.js";
import * as db from "../db/conversations.repo.js";
import { renderConversationList, renderConversationThread } from "./render.js";
import { sendReply } from "../messaging/sendReply.js";
import { logger } from "../util/logger.js";
import { asTeamMessage } from "../messaging/teamMessage.js";

export const inboxRouter = Router();

function requireBasicAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const password = config.INBOX_PASSWORD || config.INTERNAL_ADMIN_SECRET;
  const expected = "Basic " + Buffer.from(`${config.INBOX_USERNAME}:${password}`).toString("base64");

  if (header !== expected) {
    res.set("WWW-Authenticate", 'Basic realm="Viaje Ligero"');
    res.sendStatus(401);
    return;
  }
  next();
}

inboxRouter.use("/internal/inbox", requireBasicAuth);

inboxRouter.get("/internal/inbox", async (_req: Request, res: Response) => {
  const conversations = await db.listConversations(100);
  res.type("html").send(renderConversationList(conversations));
});

inboxRouter.get("/internal/inbox/:id", async (req: Request, res: Response) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const conversation = await db.getConversationById(id);
  if (!conversation) {
    res.sendStatus(404);
    return;
  }
  const messages = await db.getAllMessages(id);
  const error = typeof req.query.error === "string" ? req.query.error : undefined;
  res.type("html").send(renderConversationThread(conversation, messages, { justReplied: req.query.enviado === "1", error }));
});

const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

inboxRouter.post("/internal/inbox/:id/reply", async (req: Request, res: Response) => {
  const id = Number.parseInt(String(req.params.id), 10);
  const conversation = await db.getConversationById(id);
  if (!conversation) {
    res.sendStatus(404);
    return;
  }

  const text = String(req.body?.text ?? "").trim();
  if (!text) {
    res.redirect(`/internal/inbox/${id}`);
    return;
  }

  // Un doble toque en "Enviar" manda el mismo texto dos veces seguidas; el segundo se descarta.
  const last = (await db.getAllMessages(id)).at(-1);
  const isDuplicate =
    last?.content === asTeamMessage(text) && Date.now() - last.created_at.getTime() < DUPLICATE_WINDOW_MS;

  try {
    if (!isDuplicate) {
      await sendReply(conversation.channel, conversation.customer_external_id, text);
      await db.insertMessage({ conversationId: id, externalMessageId: null, role: "assistant", content: asTeamMessage(text) });
      if (conversation.status === "escalated") {
        await db.resolveConversation(id, "internal-inbox");
      }
    }
    // Redirigir tras el POST evita que recargar la página vuelva a mandar el mensaje al cliente.
    res.redirect(303, `/internal/inbox/${id}?enviado=1`);
  } catch (err) {
    logger.error(`Error enviando respuesta manual desde el visor (conversación ${id}): ${(err as Error).message}`);
    res.redirect(303, `/internal/inbox/${id}?error=${encodeURIComponent((err as Error).message)}`);
  }
});
