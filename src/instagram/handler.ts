import type { InstagramWebhookPayload } from "./webhook.types.js";
import * as instagramClient from "./instagramClient.js";
import { processIncomingMessage } from "../messaging/conversationEngine.js";
import { logger } from "../util/logger.js";

export async function handleInstagramWebhook(payload: InstagramWebhookPayload): Promise<void> {
  if (!instagramClient.isConfigured()) {
    logger.warn(
      "Llegó un mensaje de Instagram pero META_PAGE_ACCESS_TOKEN/INSTAGRAM_ACCOUNT_ID no están configurados — se ignora",
    );
    return;
  }

  for (const entry of payload.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      if (!event.message?.text) continue;
      await handleInstagramMessage(event.sender.id, event.message.mid, event.message.text);
    }
  }
}

async function handleInstagramMessage(senderId: string, mid: string, text: string): Promise<void> {
  const result = await processIncomingMessage({
    channel: "instagram",
    externalId: senderId,
    externalMessageId: mid,
    customerName: null,
    userText: text,
  });

  if (result) {
    await instagramClient.sendTextMessage(senderId, result.replyText);
  }
}
