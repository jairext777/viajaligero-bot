export interface MessengerWebhookPayload {
  object: string;
  entry: MessengerEntry[];
}

export interface MessengerEntry {
  id: string;
  time: number;
  messaging: MessengerMessagingEvent[];
}

export interface MessengerMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: unknown[];
  };
}
