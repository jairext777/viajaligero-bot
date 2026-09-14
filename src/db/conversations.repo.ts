import { pool } from "./pool.js";
import type { Channel, ConversationRow, EscalationReason, MessageRole } from "./types.js";

export async function getOrCreateConversation(
  channel: Channel,
  externalId: string,
  name: string | null,
): Promise<ConversationRow> {
  const result = await pool.query<ConversationRow>(
    `INSERT INTO conversations (channel, customer_external_id, customer_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (channel, customer_external_id) DO UPDATE
       SET customer_name = COALESCE(EXCLUDED.customer_name, conversations.customer_name),
           updated_at = now()
     RETURNING *`,
    [channel, externalId, name],
  );
  return result.rows[0];
}

export async function insertMessage(opts: {
  conversationId: number;
  externalMessageId: string | null;
  role: MessageRole;
  content: string;
  rawPayload?: unknown;
}): Promise<void> {
  await pool.query(
    `INSERT INTO messages (conversation_id, external_message_id, role, content, raw_payload)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (external_message_id) DO NOTHING`,
    [
      opts.conversationId,
      opts.externalMessageId,
      opts.role,
      opts.content,
      opts.rawPayload ? JSON.stringify(opts.rawPayload) : null,
    ],
  );
}

export async function getRecentMessages(
  conversationId: number,
  opts: { hours: number; limit: number },
): Promise<Array<{ role: MessageRole; content: string }>> {
  const result = await pool.query<{ role: MessageRole; content: string }>(
    `SELECT role, content FROM (
       SELECT role, content, created_at FROM messages
       WHERE conversation_id = $1 AND created_at > now() - ($2 || ' hours')::interval
       ORDER BY created_at DESC
       LIMIT $3
     ) recent
     ORDER BY created_at ASC`,
    [conversationId, opts.hours, opts.limit],
  );
  return result.rows;
}

export async function setEscalated(conversationId: number, reason: EscalationReason, summary: string): Promise<void> {
  await pool.query(
    `UPDATE conversations
     SET status = 'escalated', escalation_reason = $2, escalation_summary = $3, escalated_at = now(), updated_at = now()
     WHERE id = $1`,
    [conversationId, reason, summary],
  );
}

export async function insertEscalationEvent(opts: {
  conversationId: number;
  eventType: "escalated" | "resolved_by_team" | "auto_resolved";
  reason?: string | null;
  summary?: string | null;
  recipientNumber?: string | null;
  notificationWamid?: string | null;
}): Promise<void> {
  await pool.query(
    `INSERT INTO escalation_events (conversation_id, event_type, reason, summary, recipient_number, notification_wamid)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      opts.conversationId,
      opts.eventType,
      opts.reason ?? null,
      opts.summary ?? null,
      opts.recipientNumber ?? null,
      opts.notificationWamid ?? null,
    ],
  );
}

export async function findConversationByNotificationWamid(wamid: string): Promise<number | null> {
  const result = await pool.query<{ conversation_id: number }>(
    `SELECT conversation_id FROM escalation_events WHERE notification_wamid = $1 LIMIT 1`,
    [wamid],
  );
  return result.rows[0]?.conversation_id ?? null;
}

export async function resolveConversation(conversationId: number, resolvedBy: string): Promise<void> {
  await pool.query(
    `UPDATE conversations SET status = 'resolved', resolved_at = now(), updated_at = now() WHERE id = $1`,
    [conversationId],
  );
  await insertEscalationEvent({ conversationId, eventType: "resolved_by_team", recipientNumber: resolvedBy });
}

export async function listConversations(limit: number): Promise<ConversationRow[]> {
  const result = await pool.query<ConversationRow>(`SELECT * FROM conversations ORDER BY updated_at DESC LIMIT $1`, [
    limit,
  ]);
  return result.rows;
}

export async function getConversationById(conversationId: number): Promise<ConversationRow | null> {
  const result = await pool.query<ConversationRow>(`SELECT * FROM conversations WHERE id = $1`, [conversationId]);
  return result.rows[0] ?? null;
}

export async function getAllMessages(
  conversationId: number,
): Promise<Array<{ role: MessageRole; content: string; created_at: Date }>> {
  const result = await pool.query<{ role: MessageRole; content: string; created_at: Date }>(
    `SELECT role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId],
  );
  return result.rows;
}

export async function autoResolveStale(hours: number): Promise<number> {
  const result = await pool.query<{ id: number }>(
    `UPDATE conversations
     SET status = 'resolved', resolved_at = now(), updated_at = now()
     WHERE status = 'escalated' AND escalated_at < now() - ($1 || ' hours')::interval
     RETURNING id`,
    [hours],
  );
  for (const row of result.rows) {
    await insertEscalationEvent({ conversationId: row.id, eventType: "auto_resolved" });
  }
  return result.rows.length;
}
