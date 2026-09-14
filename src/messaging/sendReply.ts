import type { Channel } from "../db/types.js";
import { sendTextMessage as sendWhatsApp } from "../whatsapp/whatsappClient.js";
import { sendTextMessage as sendMessenger } from "../facebook/facebookClient.js";
import { sendTextMessage as sendInstagram } from "../instagram/instagramClient.js";

export async function sendReply(channel: Channel, externalId: string, text: string): Promise<void> {
  switch (channel) {
    case "whatsapp":
      await sendWhatsApp(externalId, text);
      return;
    case "messenger":
      await sendMessenger(externalId, text);
      return;
    case "instagram":
      await sendInstagram(externalId, text);
      return;
  }
}
