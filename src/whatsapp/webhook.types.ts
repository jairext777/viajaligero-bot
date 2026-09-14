export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  field: string;
  value: WhatsAppValue;
}

export interface WhatsAppValue {
  messaging_product: string;
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: unknown[];
}

export interface WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  context?: { id: string; from?: string };
}
