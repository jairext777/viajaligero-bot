import type Anthropic from "@anthropic-ai/sdk";
import { claude } from "./claudeClient.js";
import { escalateToHumanTool, sendPaymentQrTool, sendProductPhotosTool } from "./tools.js";
import { config } from "../config/env.js";
import * as escalationService from "../escalation/escalationService.js";
import type { EscalationReason } from "../db/types.js";

const MAX_TOOL_ITERATIONS = 4;
const EMPTY_REPLY_FALLBACK = "Uy, no te entendí bien 😅 ¿Me lo cuentas de otra forma?";

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export interface AgentResult {
  replyText: string;
  sendPaymentQr: boolean;
  productPhotoIds: string[];
}

export async function runAgentTurn(opts: {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userText: string;
  systemPromptText: string;
  conversationId: number;
  customerContactId: string;
  customerName: string | null;
}): Promise<AgentResult> {
  const messages: Anthropic.MessageParam[] = [
    ...opts.history.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.content })),
    { role: "user", content: opts.userText },
  ];

  let sendPaymentQr = false;
  const productPhotoIds: string[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await claude.messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
      system: [{ type: "text", text: opts.systemPromptText, cache_control: { type: "ephemeral", ttl: "1h" } }],
      tools: [escalateToHumanTool, sendPaymentQrTool, sendProductPhotosTool],
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const replyText = extractText(response.content);
      // Un mensaje rechazado por los filtros de seguridad llega sin texto; WhatsApp no acepta cuerpos vacíos.
      return { replyText: replyText || EMPTY_REPLY_FALLBACK, sendPaymentQr, productPhotoIds };
    }

    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse) {
      return { replyText: extractText(response.content) || EMPTY_REPLY_FALLBACK, sendPaymentQr, productPhotoIds };
    }

    if (toolUse.name === "send_product_photos") {
      const { photo_ids } = toolUse.input as { photo_ids: string[] };
      for (const id of photo_ids) if (!productPhotoIds.includes(id)) productPhotoIds.push(id);
      messages.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: toolUse.id, content: `Fotos enviadas: ${photo_ids.join(", ")}.` }],
      });
      continue;
    }

    if (toolUse.name === "send_payment_qr") {
      sendPaymentQr = true;
      messages.push({
        role: "user",
        content: [{ type: "tool_result", tool_use_id: toolUse.id, content: "QR de Yape enviado." }],
      });
      continue;
    }

    const input = toolUse.input as { reason: EscalationReason; summary: string };
    const outcome = await escalationService.escalate({
      conversationId: opts.conversationId,
      customerContactId: opts.customerContactId,
      customerName: opts.customerName,
      reason: input.reason,
      summary: input.summary,
    });

    messages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: outcome.notifiedAny
            ? "Escalado y equipo notificado."
            : "Escalado registrado, pero no se pudo notificar a nadie del equipo por WhatsApp.",
          is_error: !outcome.notifiedAny,
        },
      ],
    });
  }

  return {
    replyText: "Uy, se me cruzaron los cables 😅 ya avisé al equipo para que te ayuden directamente.",
    sendPaymentQr,
    productPhotoIds,
  };
}
