import { config } from "../config/env.js";

// La API de mensajería de Instagram usa el token de la Page vinculada. Confirmar el
// endpoint exacto (puede ser /me/messages o /{INSTAGRAM_ACCOUNT_ID}/messages según la
// versión vigente de la API) contra la documentación de Meta al momento de configurar
// la app — este patrón es el estable históricamente, pero puede haber cambiado.
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
    throw new Error(`Instagram API error ${response.status}: ${await response.text()}`);
  }
}

export function isConfigured(): boolean {
  return config.META_PAGE_ACCESS_TOKEN.length > 0 && config.INSTAGRAM_ACCOUNT_ID.length > 0;
}
