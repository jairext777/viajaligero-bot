import type { EscalationReason } from "../db/types.js";

const REASON_LABELS: Record<EscalationReason, string> = {
  explicit_request: "El cliente pidió hablar con una persona",
  low_confidence: "No hay una respuesta clara en catálogo/FAQ",
};

function sanitizeForTemplate(text: string): string {
  return text.replace(/[\r\n\t]+/g, " ").trim();
}

export function buildEscalationTemplateParams(opts: {
  customerLabel: string;
  reason: EscalationReason;
  summary: string;
}): string[] {
  return [sanitizeForTemplate(opts.customerLabel), REASON_LABELS[opts.reason], sanitizeForTemplate(opts.summary)];
}
