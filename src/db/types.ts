export type Channel = "whatsapp" | "messenger" | "instagram";
export type ConversationStatus = "active" | "escalated" | "resolved";
export type MessageRole = "user" | "assistant";
export type EscalationReason = "explicit_request" | "low_confidence";

export interface ConversationRow {
  id: number;
  channel: Channel;
  customer_external_id: string;
  customer_name: string | null;
  status: ConversationStatus;
  escalation_reason: string | null;
  escalation_summary: string | null;
  escalated_at: Date | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}
