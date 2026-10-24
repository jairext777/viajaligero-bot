import { config } from "../config/env.js";
import * as db from "../db/conversations.repo.js";
import type { Channel } from "../db/types.js";
import { getCatalogText } from "../catalog/catalogSync.js";
import { buildSystemPrompt } from "../llm/systemPrompt.js";
import { runAgentTurn } from "../llm/agent.js";

// Los clientes suelen mandar varios mensajes seguidos ("Hola" + "precio?"); se espera un
// momento para contestarlos todos juntos en una sola respuesta en vez de una por mensaje.
const BURST_WAIT_MS = 3000;

const latestMessageSeq = new Map<number, number>();
const inFlightTurn = new Map<number, Promise<unknown>>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function processIncomingMessage(opts: {
  channel: Channel;
  externalId: string;
  externalMessageId: string | null;
  customerName: string | null;
  userText: string;
  rawPayload?: unknown;
}): Promise<{ replyText: string; sendPaymentQr: boolean } | null> {
  const conversation = await db.getOrCreateConversation(opts.channel, opts.externalId, opts.customerName);

  await db.insertMessage({
    conversationId: conversation.id,
    externalMessageId: opts.externalMessageId,
    role: "user",
    content: opts.userText,
    rawPayload: opts.rawPayload,
  });

  if (conversation.status === "escalated") {
    // El bot se queda en silencio: el mensaje ya quedó guardado para el registro del equipo.
    return null;
  }

  const seq = (latestMessageSeq.get(conversation.id) ?? 0) + 1;
  latestMessageSeq.set(conversation.id, seq);
  await sleep(BURST_WAIT_MS);
  if (latestMessageSeq.get(conversation.id) !== seq) {
    return null; // llegó un mensaje más nuevo: ese turno responde a todos
  }

  // Si el bot todavía está contestando un mensaje anterior, se espera a que termine para que
  // esta respuesta vea la anterior en el historial y no la repita.
  const previousTurn = inFlightTurn.get(conversation.id);
  const turn = (async () => {
    await previousTurn?.catch(() => undefined);
    return answerPendingMessages(conversation.id, opts);
  })();
  inFlightTurn.set(conversation.id, turn);

  try {
    return await turn;
  } finally {
    if (inFlightTurn.get(conversation.id) === turn) inFlightTurn.delete(conversation.id);
    if (latestMessageSeq.get(conversation.id) === seq) latestMessageSeq.delete(conversation.id);
  }
}

async function answerPendingMessages(
  conversationId: number,
  opts: { channel: Channel; externalId: string; customerName: string | null },
): Promise<{ replyText: string; sendPaymentQr: boolean } | null> {
  // El turno anterior pudo haber escalado la conversación mientras este esperaba.
  const current = await db.getConversationById(conversationId);
  if (!current || current.status === "escalated") return null;

  const recent = await db.getRecentMessages(conversationId, {
    hours: config.CONTEXT_WINDOW_HOURS,
    limit: config.MAX_CONTEXT_MESSAGES,
  });

  let firstPending = recent.length;
  while (firstPending > 0 && recent[firstPending - 1].role === "user") firstPending--;
  const pending = recent.slice(firstPending);
  if (pending.length === 0) return null;

  const catalogText = await getCatalogText();
  const systemPromptText = buildSystemPrompt(catalogText, opts.channel);

  const { replyText, sendPaymentQr } = await runAgentTurn({
    history: recent.slice(0, firstPending),
    userText: pending.map((m) => m.content).join("\n"),
    systemPromptText,
    conversationId,
    customerContactId: opts.externalId,
    customerName: opts.customerName,
  });

  // Se fecha justo después del último mensaje que respondió: así, un mensaje que llegó mientras se
  // generaba queda después de esta respuesta y el siguiente turno lo ve como pendiente.
  const answeredUpTo = pending[pending.length - 1].created_at;
  await db.insertMessage({
    conversationId,
    externalMessageId: null,
    role: "assistant",
    content: replyText,
    createdAt: new Date(answeredUpTo.getTime() + 1),
  });

  return { replyText, sendPaymentQr };
}
