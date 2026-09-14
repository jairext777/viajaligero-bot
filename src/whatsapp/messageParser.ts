import type { WhatsAppMessage, WhatsAppValue } from "./webhook.types.js";

export function extractUserText(message: WhatsAppMessage): string {
  if (message.type === "text" && message.text) {
    return message.text.body;
  }
  return `[${message.type}]`;
}

export function findContactName(value: WhatsAppValue, waId: string): string | null {
  const contact = value.contacts?.find((c) => c.wa_id === waId);
  return contact?.profile.name ?? null;
}
