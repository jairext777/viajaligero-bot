import type { ConversationRow, MessageRole } from "../db/types.js";

const PAGE_STYLES = `
  body { font-family: -apple-system, system-ui, sans-serif; background: #f4f4f5; margin: 0; padding: 24px; color: #1a1a1a; }
  h1 { font-size: 20px; margin-bottom: 16px; }
  a { color: #0a66c2; text-decoration: none; }
  table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }
  th, td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #eee; font-size: 14px; }
  th { background: #fafafa; font-weight: 600; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
  .status-active { background: #e6f4ea; color: #1e7e34; }
  .status-escalated { background: #fdecea; color: #c0392b; }
  .status-resolved { background: #eef0f2; color: #555; }
  .channel { text-transform: uppercase; font-size: 11px; color: #888; }
  .bubble { max-width: 70%; padding: 10px 14px; border-radius: 14px; margin: 6px 0; font-size: 14px; line-height: 1.4; white-space: pre-wrap; }
  .bubble-user { background: white; margin-right: auto; }
  .bubble-assistant { background: #d9f2e6; margin-left: auto; }
  .thread { display: flex; flex-direction: column; max-width: 640px; }
  .meta { color: #888; font-size: 12px; margin-top: 24px; }
`;

function page(title: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${PAGE_STYLES}</style></head><body>${body}</body></html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderConversationList(conversations: ConversationRow[]): string {
  const rows = conversations
    .map(
      (c) => `<tr>
        <td><span class="channel">${c.channel}</span></td>
        <td><a href="/internal/inbox/${c.id}">${escapeHtml(c.customer_name ?? c.customer_external_id)}</a><br><small>${escapeHtml(c.customer_external_id)}</small></td>
        <td><span class="status status-${c.status}">${c.status}</span></td>
        <td>${new Date(c.updated_at).toLocaleString("es-PE")}</td>
      </tr>`,
    )
    .join("");

  return page(
    "Conversaciones — Viaje Ligero",
    `<h1>Conversaciones recientes</h1>
     <table>
       <tr><th>Canal</th><th>Cliente</th><th>Estado</th><th>Última actividad</th></tr>
       ${rows || '<tr><td colspan="4">Sin conversaciones todavía.</td></tr>'}
     </table>`,
  );
}

export function renderConversationThread(
  conversation: ConversationRow,
  messages: Array<{ role: MessageRole; content: string; created_at: Date }>,
): string {
  const bubbles = messages
    .map(
      (m) =>
        `<div class="bubble bubble-${m.role}">${escapeHtml(m.content)}<div class="meta">${new Date(m.created_at).toLocaleString("es-PE")}</div></div>`,
    )
    .join("");

  const escalationInfo =
    conversation.status === "escalated"
      ? `<p><strong>Escalado</strong> — motivo: ${escapeHtml(conversation.escalation_reason ?? "")} — ${escapeHtml(conversation.escalation_summary ?? "")}</p>`
      : "";

  return page(
    "Conversación — Viaje Ligero",
    `<p><a href="/internal/inbox">&larr; Volver</a></p>
     <h1>${escapeHtml(conversation.customer_name ?? conversation.customer_external_id)} <span class="channel">(${conversation.channel})</span></h1>
     ${escalationInfo}
     <div class="thread">${bubbles || "<p>Sin mensajes.</p>"}</div>`,
  );
}
