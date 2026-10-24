import type Anthropic from "@anthropic-ai/sdk";
import { getProductPhotos } from "../catalog/catalogSync.js";

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

export const sendPaymentQrTool: Anthropic.Tool = {
  name: "send_payment_qr",
  description:
    "Envía la imagen del QR de Yape para pagar. Úsala cuando el cliente pregunte cómo pagar, " +
    "quiera pagar por Yape, o pida el QR/número de Yape. No la uses más de una vez por conversación " +
    "si ya la mandaste hace poco.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {},
    required: [],
    additionalProperties: false,
  },
};

// Se arma una sola vez al arrancar (no por mensaje) para no romper el caché del prompt.
const photos = getProductPhotos();
export const sendProductPhotosTool: Anthropic.Tool = {
  name: "send_product_photos",
  description:
    "Envía al cliente fotos de productos por este chat. Úsala cuando pida ver fotos, el producto o " +
    "los colores. Elige solo las fotos que pidió (todas si quiere ver todos los colores). Fotos " +
    "disponibles: " + photos.map((p) => `${p.id} (${p.caption})`).join(", ") + ". No repitas fotos que " +
    "ya mandaste hace poco en la misma conversación.",
  strict: true,
  input_schema: {
    type: "object",
    properties: {
      photo_ids: { type: "array", items: { type: "string", enum: photos.map((p) => p.id) } },
    },
    required: ["photo_ids"],
    additionalProperties: false,
  },
};
