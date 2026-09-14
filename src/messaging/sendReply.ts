import type { Channel } from "../db/types.js";
import { config } from "../config/env.js";
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

// Manda lo que haya producido el agente para un mensaje entrante: el texto siempre,
// y de encima el QR de Yape si el agente decidió que correspondía.
export async function deliverAgentResult(
  channel: Channel,
  externalId: string,
  result: { replyText: string; sendPaymentQr: boolean },
): Promise<void> {
  await sendReply(channel, externalId, result.replyText);
  if (result.sendPaymentQr) {
    await sendPaymentQrImage(channel, externalId);
  }
}

export async function sendPaymentQrImage(channel: Channel, externalId: string): Promise<void> {
  const imageUrl = `${config.PUBLIC_BASE_URL}/assets/yape-qr.png`;
  switch (channel) {
    case "whatsapp":
      await sendWhatsAppImage(externalId, imageUrl, "Paga con Yape escaneando este QR 🙌");
      return;
    case "messenger":
      await sendMessengerImage(externalId, imageUrl);
      return;
    case "instagram":
      await sendInstagramImage(externalId, imageUrl);
      return;
  }
}
