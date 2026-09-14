import { sendTemplateMessage } from "../whatsapp/whatsappClient.js";
import { buildEscalationTemplateParams } from "./templates.js";
import { config } from "../config/env.js";
import { logger } from "../util/logger.js";
import * as db from "../db/conversations.repo.js";
import type { EscalationReason } from "../db/types.js";

export async function escalate(opts: {
  conversationId: number;
  customerContactId: string;
  customerName: string | null;
  reason: EscalationReason;
  summary: string;
}): Promise<{ notifiedAny: boolean }> {
  await db.setEscalated(opts.conversationId, opts.reason, opts.summary);

  const customerLabel = opts.customerName ?? opts.customerContactId;
  const templateParams = buildEscalationTemplateParams({ customerLabel, reason: opts.reason, summary: opts.summary });

  const results = await Promise.allSettled(
    config.SUPPORT_WHATSAPP_NUMBERS.map((number) =>
      sendTemplateMessage(number, config.ESCALATION_TEMPLATE_NAME, config.ESCALATION_TEMPLATE_LANG, templateParams),
    ),
  );

  let notifiedAny = false;
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const recipient = config.SUPPORT_WHATSAPP_NUMBERS[i];

    if (result.status === "fulfilled") {
      notifiedAny = true;
      await db.insertEscalationEvent({
        conversationId: opts.conversationId,
        eventType: "escalated",
        reason: opts.reason,
        summary: opts.summary,
        recipientNumber: recipient,
        notificationWamid: result.value.messages[0]?.id ?? null,
      });
    } else {
      logger.error({ err: result.reason, recipient }, "No se pudo notificar la escalación a un número de soporte");
      await db.insertEscalationEvent({
        conversationId: opts.conversationId,
        eventType: "escalated",
        reason: opts.reason,
        summary: opts.summary,
        recipientNumber: recipient,
        notificationWamid: null,
      });
    }
  }

  return { notifiedAny };
}

export async function resolveFromTeamReply(repliedToWamid: string, resolvedBy: string): Promise<boolean> {
  const conversationId = await db.findConversationByNotificationWamid(repliedToWamid);
  if (!conversationId) return false;
  await db.resolveConversation(conversationId, resolvedBy);
  return true;
}

export async function sweepStaleEscalations(): Promise<void> {
  const count = await db.autoResolveStale(config.ESCALATION_AUTO_RESOLVE_HOURS);
  if (count > 0) {
    logger.info({ count }, "Conversaciones escaladas resueltas automáticamente por TTL");
  }
}
