import { config } from "../config/env.js";

interface SendMessageResponse {
  messages: Array<{ id: string }>;
}

async function callGraph(path: string, body: unknown): Promise<SendMessageResponse> {
  const url = `https://graph.facebook.com/${config.META_GRAPH_API_VERSION}/${config.META_PHONE_NUMBER_ID}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.META_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`WhatsApp API error ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<SendMessageResponse>;
}

export async function sendTextMessage(to: string, body: string): Promise<SendMessageResponse> {
  return callGraph("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body },
  });
}

export async function sendImageMessage(to: string, imageUrl: string, caption?: string): Promise<SendMessageResponse> {
  return callGraph("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "image",
    image: { link: imageUrl, ...(caption ? { caption } : {}) },
  });
}

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[],
): Promise<SendMessageResponse> {
  return callGraph("/messages", {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components: [{ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) }],
    },
  });
}
