export interface InstagramWebhookPayload {
  object: string;
  entry: InstagramEntry[];
}

export interface InstagramEntry {
  id: string;
  time: number;
  messaging: InstagramMessagingEvent[];
}

export interface InstagramMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: unknown[];
  };
}
