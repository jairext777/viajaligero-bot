import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface FaqEntry {
  question: string;
  answer: string;
}

function loadFaqEntries(): FaqEntry[] {
  const faqPath = join(__dirname, "../content/faq.json");
  const raw = readFileSync(faqPath, "utf-8");
  return JSON.parse(raw) as FaqEntry[];
}

export function getFaqText(): string {
  const entries = loadFaqEntries();
  const lines = entries.map((entry) => `P: ${entry.question}\nR: ${entry.answer}`);
  return ["PREGUNTAS FRECUENTES:", ...lines].join("\n\n");
}
