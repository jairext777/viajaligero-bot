import { config } from "../config/env.js";
import { extractUserText, findContactName } from "./messageParser.js";
import type { WhatsAppMessage, WhatsAppValue, WhatsAppWebhookPayload } from "./webhook.types.js";
import { processIncomingMessage } from "../messaging/conversationEngine.js";
import { deliverAgentResult } from "../messaging/sendReply.js";
import * as escalationService from "../escalation/escalationService.js";
import { logger } from "../util/logger.js";

export async function handleWhatsAppWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value.messages) continue; // delivery/read receipts u otros eventos, no mensajes entrantes

      for (const message of value.messages) {
        if (config.SUPPORT_WHATSAPP_NUMBERS.includes(message.from)) {
          await handleSupportTeamMessage(message);
        } else {
          await handleCustomerMessage(message, value);
        }
      }
    }
  }
}

async function handleSupportTeamMessage(message: WhatsAppMessage): Promise<void> {
  const repliedToWamid = message.context?.id;
  if (!repliedToWamid) return;
  const resolved = await escalationService.resolveFromTeamReply(repliedToWamid, message.from);
  if (resolved) {
    logger.info({ from: message.from }, "Conversación resuelta por el equipo de soporte");
  }
}

async function handleCustomerMessage(message: WhatsAppMessage, value: WhatsAppValue): Promise<void> {
  const customerName = findContactName(value, message.from);
  const userText = extractUserText(message);

  const result = await processIncomingMessage({
    channel: "whatsapp",
    externalId: message.from,
    externalMessageId: message.id,
    customerName,
    userText,
    rawPayload: message,
  });

  if (result) {
    await deliverAgentResult("whatsapp", message.from, result);
  }
}
