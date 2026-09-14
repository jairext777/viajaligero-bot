import type Anthropic from "@anthropic-ai/sdk";

export const escalateToHumanTool: Anthropic.Tool = {
  name: "escalate_to_human",
  description:
    "Deriva la conversación a una persona del equipo. Úsala solo cuando el cliente lo pide " +
    "explícitamente, o cuando no tienes una respuesta confiable con el catálogo/FAQ (reclamos, " +
    "pedidos ya hechos, algo fuera de lo que sabes).",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      reason: { type: "string", enum: ["explicit_request", "low_confidence"] },
      summary: {
        type: "string",
        description: "Resumen breve (máx. 200 caracteres) para dar contexto inmediato al equipo.",
      },
    },
    required: ["reason", "summary"],
    additionalProperties: false,
  },
};
