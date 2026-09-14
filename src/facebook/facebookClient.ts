import { config } from "../config/env.js";

// Endpoint y forma del payload verificados contra el patrón estable de la Send API de
// Messenger; confirmar el nombre exacto del campo/endpoint contra la documentación vigente
// de Meta al momento de configurar la app (puede haber cambiado desde el entrenamiento).
export async function sendTextMessage(recipientId: string, text: string): Promise<void> {
  const url = `https://graph.facebook.com/${config.META_GRAPH_API_VERSION}/me/messages?access_token=${config.META_PAGE_ACCESS_TOKEN}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text },
    }),
  });

  if (!response.ok) {
    throw new Error(`Messenger API error ${response.status}: ${await response.text()}`);
  }
}

export async function sendImageMessage(recipientId: string, imageUrl: string): Promise<void> {
  const url = `https://graph.facebook.com/${config.META_GRAPH_API_VERSION}/me/messages?access_token=${config.META_PAGE_ACCESS_TOKEN}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { attachment: { type: "image", payload: { url: imageUrl, is_reusable: true } } },
    }),
  });

  if (!response.ok) {
    throw new Error(`Messenger API error ${response.status}: ${await response.text()}`);
  }
}

export function isConfigured(): boolean {
  return config.META_PAGE_ACCESS_TOKEN.length > 0;
}
