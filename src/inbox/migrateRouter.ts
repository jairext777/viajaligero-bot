import { Router } from "express";
import type { Request, Response } from "express";
import { config } from "../config/env.js";
import { pool } from "../db/pool.js";
import { logger } from "../util/logger.js";

// Endpoint temporal, de un solo uso, para traer el historial de conversaciones
// que corrió en local antes de tener Railway. Se elimina después de usarlo.
export const migrateRouter = Router();

interface LegacyConversation {
  id: number;
  channel: string;
  customer_external_id: string;
  customer_name: string | null;
  status: string;
  escalation_reason: string | null;
  escalation_summary: string | null;
  escalated_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

interface LegacyMessage {
  conversation_id: number;
  external_message_id: string | null;
  role: string;
  content: string;
  created_at: string;
}

interface LegacyEscalationEvent {
  conversation_id: number;
  event_type: string;
  reason: string | null;
  summary: string | null;
  recipient_number: string | null;
  notification_wamid: string | null;
  created_at: string;
}

migrateRouter.post("/internal/migrate-legacy", async (req: Request, res: Response) => {
  if (req.header("x-internal-secret") !== config.INTERNAL_ADMIN_SECRET) {
    res.sendStatus(401);
    return;
  }

  const conversations: LegacyConversation[] = req.body.conversations ?? [];
  const messages: LegacyMessage[] = req.body.messages ?? [];
  const escalationEvents: LegacyEscalationEvent[] = req.body.escalationEvents ?? [];

  const idMap = new Map<number, number>();

  try {
    for (const c of conversations) {
      const inserted = await pool.query<{ id: number }>(
        `INSERT INTO conversations (channel, customer_external_id, customer_name, status, escalation_reason, escalation_summary, escalated_at, resolved_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (channel, customer_external_id) DO NOTHING
         RETURNING id`,
        [
          c.channel,
          c.customer_external_id,
          c.customer_name,
          c.status,
          c.escalation_reason,
          c.escalation_summary,
          c.escalated_at,
          c.resolved_at,
          c.created_at,
          c.updated_at,
        ],
      );

      if (inserted.rows[0]) {
        idMap.set(c.id, inserted.rows[0].id);
      } else {
        const existing = await pool.query<{ id: number }>(
          `SELECT id FROM conversations WHERE channel = $1 AND customer_external_id = $2`,
          [c.channel, c.customer_external_id],
        );
        if (existing.rows[0]) idMap.set(c.id, existing.rows[0].id);
      }
    }

    let insertedMessages = 0;
    for (const m of messages) {
      const newConversationId = idMap.get(m.conversation_id);
      if (!newConversationId) continue;
      await pool.query(
        `INSERT INTO messages (conversation_id, external_message_id, role, content, created_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (external_message_id) DO NOTHING`,
        [newConversationId, m.external_message_id, m.role, m.content, m.created_at],
      );
      insertedMessages++;
    }

    let insertedEvents = 0;
    for (const e of escalationEvents) {
      const newConversationId = idMap.get(e.conversation_id);
      if (!newConversationId) continue;
      await pool.query(
        `INSERT INTO escalation_events (conversation_id, event_type, reason, summary, recipient_number, notification_wamid, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [newConversationId, e.event_type, e.reason, e.summary, e.recipient_number, e.notification_wamid, e.created_at],
      );
      insertedEvents++;
    }

    res.status(200).json({
      ok: true,
      conversationsMapped: idMap.size,
      insertedMessages,
      insertedEvents,
    });
  } catch (err) {
    logger.error({ err }, "Error migrando datos históricos");
    res.status(500).json({ ok: false, error: (err as Error).message });
  }
});
