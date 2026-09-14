import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { config } from "../config/env.js";
import * as db from "../db/conversations.repo.js";
import { renderConversationList, renderConversationThread } from "./render.js";

export const inboxRouter = Router();

function requireBasicAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const expected = "Basic " + Buffer.from(`admin:${config.INTERNAL_ADMIN_SECRET}`).toString("base64");

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
  res.type("html").send(renderConversationThread(conversation, messages));
});
