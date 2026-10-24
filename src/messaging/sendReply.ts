import type { Channel } from "../db/types.js";
import { config } from "../config/env.js";
import type { AgentResult } from "../llm/agent.js";
import { getProductPhotos } from "../catalog/catalogSync.js";
import { logger } from "../util/logger.js";
import { sendTextMessage as sendWhatsAppText, sendImageMessage as sendWhatsAppImage } from "../whatsapp/whatsappClient.js";
import { sendTextMessage as sendMessengerText, sendImageMessage as sendMessengerImage } from "../facebook/facebookClient.js";
import { sendTextMessage as sendInstagramText, sendImageMessage as sendInstagramImage } from "../instagram/instagramClient.js";

export async function sendReply(channel: Channel, externalId: string, text: string): Promise<void> {
  switch (channel) {
    case "whatsapp":
      await sendWhatsAppText(externalId, text);
      return;
    case "messenger":
      await sendMessengerText(externalId, text);
      return;
    case "instagram":
      await sendInstagramText(externalId, text);
      return;
  }
}

// Manda lo que haya producido el agente para un mensaje entrante: primero las fotos de producto
// que pidió el cliente (el texto suele referirse a ellas), luego el texto y, si toca, el QR de Yape.
export async function deliverAgentResult(channel: Channel, externalId: string, result: AgentResult): Promise<void> {
  const photosById = new Map(getProductPhotos().map((p) => [p.id, p]));
  for (const id of result.productPhotoIds) {
    const photo = photosById.get(id);
    if (!photo) continue;
    try {
      await sendImage(channel, externalId, `${config.PUBLIC_BASE_URL}/assets/${photo.file}`, photo.caption);
    } catch (err) {
      // Una foto que falla no debe impedir que llegue el texto de la respuesta.
      logger.error(`No se pudo enviar la foto ${id} a ${externalId}: ${(err as Error).message}`);
    }
  }
  await sendReply(channel, externalId, result.replyText);
  if (result.sendPaymentQr) {
    await sendPaymentQrImage(channel, externalId);
  }
}

export async function sendPaymentQrImage(channel: Channel, externalId: string): Promise<void> {
  await sendImage(channel, externalId, `${config.PUBLIC_BASE_URL}/assets/yape-qr.png`, "Paga con Yape escaneando este QR 🙌");
}

async function sendImage(channel: Channel, externalId: string, imageUrl: string, caption: string): Promise<void> {
  switch (channel) {
    case "whatsapp":
      await sendWhatsAppImage(externalId, imageUrl, caption);
      return;
    case "messenger":
      await sendMessengerImage(externalId, imageUrl);
      return;
    case "instagram":
      await sendInstagramImage(externalId, imageUrl);
      return;
  }
}
