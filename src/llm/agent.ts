import type Anthropic from "@anthropic-ai/sdk";
import { claude } from "./claudeClient.js";
import { escalateToHumanTool, sendPaymentQrTool } from "./tools.js";
import { config } from "../config/env.js";
import * as escalationService from "../escalation/escalationService.js";
import type { EscalationReason } from "../db/types.js";

const MAX_TOOL_ITERATIONS = 3;

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export async function runAgentTurn(opts: {
  history: Array<{ role: "user" | "assistant"; content: string }>;
  userText: string;
  systemPromptText: string;
  conversationId: number;
  customerContactId: string;
  customerName: string | null;
}): Promise<{ replyText: string; sendPaymentQr: boolean }> {
  const messages: Anthropic.MessageParam[] = [
    ...opts.history.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.content })),
    { role: "user", content: opts.userText },
  ];

  let sendPaymentQr = false;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await claude.messages.create({
      model: config.ANTHROPIC_MODEL,
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      tool_choice: { type: "auto", disable_parallel_tool_use: true },
      system: [{ type: "text", text: opts.systemPromptText, cache_control: { type: "ephemeral", ttl: "1h" } }],
      tools: [escalateToHumanTool, sendPaymentQrTool],
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      return { replyText: extractText(response.content), sendPaymentQr };
    }

    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (!toolUse) {
      return { replyText: extractText(response.content), sendPaymentQr };
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
  };
}
