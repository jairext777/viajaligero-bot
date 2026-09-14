import type { MessengerWebhookPayload } from "./webhook.types.js";
import * as facebookClient from "./facebookClient.js";
import { processIncomingMessage } from "../messaging/conversationEngine.js";
import { deliverAgentResult } from "../messaging/sendReply.js";
import { logger } from "../util/logger.js";

export async function handleMessengerWebhook(payload: MessengerWebhookPayload): Promise<void> {
  if (!facebookClient.isConfigured()) {
    logger.warn("Llegó un mensaje de Messenger pero META_PAGE_ACCESS_TOKEN no está configurado — se ignora");
    return;
  }

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      if (!event.message?.text) continue; // ignora confirmaciones de lectura/entrega y adjuntos sin texto
      await handleMessengerMessage(event.sender.id, event.message.mid, event.message.text);
    }
  }
}

async function handleMessengerMessage(senderId: string, mid: string, text: string): Promise<void> {
  const result = await processIncomingMessage({
    channel: "messenger",
    externalId: senderId,
    externalMessageId: mid,
    // Messenger no manda el nombre del cliente en el payload del webhook; si hiciera
    // falta, se puede pedir por separado a GET /{psid}?fields=first_name,last_name.
    customerName: null,
    userText: text,
  });

  if (result) {
    await deliverAgentResult("messenger", senderId, result);
  }
}
