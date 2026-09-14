import { config } from "../config/env.js";
import * as db from "../db/conversations.repo.js";
import type { Channel } from "../db/types.js";
import { getCatalogText } from "../shopify/catalogSync.js";
import { buildSystemPrompt } from "../llm/systemPrompt.js";
import { runAgentTurn } from "../llm/agent.js";

export async function processIncomingMessage(opts: {
  channel: Channel;
  externalId: string;
  externalMessageId: string | null;
  customerName: string | null;
  userText: string;
  rawPayload?: unknown;
}): Promise<{ replyText: string } | null> {
  const conversation = await db.getOrCreateConversation(opts.channel, opts.externalId, opts.customerName);

  // El historial se lee ANTES de insertar el mensaje actual, para no duplicarlo
  // cuando se arma el contexto de la conversación más abajo.
  const history =
    conversation.status === "escalated"
      ? []
      : await db.getRecentMessages(conversation.id, {
          hours: config.CONTEXT_WINDOW_HOURS,
          limit: config.MAX_CONTEXT_MESSAGES,
        });

  await db.insertMessage({
    conversationId: conversation.id,
    externalMessageId: opts.externalMessageId,
    role: "user",
    content: opts.userText,
    rawPayload: opts.rawPayload,
  });

  if (conversation.status === "escalated") {
    // El bot se queda en silencio: el mensaje ya quedó guardado para el registro del equipo.
    return null;
  }

  const catalogText = await getCatalogText();
  const systemPromptText = buildSystemPrompt(catalogText, opts.channel);

  const { replyText } = await runAgentTurn({
    history,
    userText: opts.userText,
    systemPromptText,
    conversationId: conversation.id,
    customerContactId: opts.externalId,
    customerName: opts.customerName,
  });

  await db.insertMessage({
    conversationId: conversation.id,
    externalMessageId: null,
    role: "assistant",
    content: replyText,
  });

  return { replyText };
}
