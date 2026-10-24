// Las respuestas que escribe una persona del equipo se guardan con rol "assistant" junto a
// las del bot; esta marca le permite al bot distinguirlas y tratarlas como información confirmada.
export const TEAM_MESSAGE_PREFIX = "[Equipo Viaje Ligero] ";

export function asTeamMessage(text: string): string {
  return TEAM_MESSAGE_PREFIX + text;
}
