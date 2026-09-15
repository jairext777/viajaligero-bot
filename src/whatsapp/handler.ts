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
        // Mensajes normales traen "from" (el número). Mensajes que llegan por anuncios
        // "Click to WhatsApp" pueden traer en su lugar "from_user_id" (un identificador
        // opaco tipo "PE.xxxxx") sin exponer el número real — se puede usar igual como
        // identificador del cliente y como destinatario al responder.
        const senderId = message.from ?? message.from_user_id;

        if (!senderId) {
          logger.warn(`Mensaje de WhatsApp sin remitente, se ignora. Payload: ${JSON.stringify(message)}`);
          continue;
        }

        try {
          if (config.SUPPORT_WHATSAPP_NUMBERS.includes(senderId)) {
            await handleSupportTeamMessage(message, senderId);
          } else {
            await handleCustomerMessage(message, value, senderId);
          }
        } catch (err) {
          // Que un mensaje falle no debe tumbar el resto de mensajes del mismo webhook.
          logger.error(
            `Error procesando un mensaje individual de WhatsApp: ${(err as Error).message}. Payload: ${JSON.stringify(message)}`,
          );
        }
      }
    }
  }
}

async function handleSupportTeamMessage(message: WhatsAppMessage, senderId: string): Promise<void> {
  const repliedToWamid = message.context?.id;
  if (!repliedToWamid) return;
  const resolved = await escalationService.resolveFromTeamReply(repliedToWamid, senderId);
  if (resolved) {
    logger.info(`Conversación resuelta por el equipo de soporte (${senderId})`);
  }
}

async function handleCustomerMessage(message: WhatsAppMessage, value: WhatsAppValue, senderId: string): Promise<void> {
  const customerName = findContactName(value, senderId);
  const userText = extractUserText(message);

  const result = await processIncomingMessage({
    channel: "whatsapp",
    externalId: senderId,
    externalMessageId: message.id,
    customerName,
    userText,
    rawPayload: message,
  });

  if (result) {
    await deliverAgentResult("whatsapp", senderId, result);
  }
}
