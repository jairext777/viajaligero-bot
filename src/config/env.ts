import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.length > 0 ? value : fallback;
}

function optionalInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`La variable de entorno ${name} debe ser un número entero, recibido: "${raw}"`);
  }
  return parsed;
}

function parseNumberList(name: string): string[] {
  const raw = requireEnv(name);
  const numbers = raw
    .split(",")
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
  if (numbers.length === 0) {
    throw new Error(`${name} debe tener al menos un número de WhatsApp`);
  }
  return numbers;
}

const shopifyApiVersion = requireEnv("SHOPIFY_API_VERSION");

// Shopify tradujo silenciosamente el estado UNLISTED a ACTIVE en versiones de API
// anteriores a 2025-10. Con una versión más vieja, el bot recomendaría productos
// que la tienda ocultó a propósito. La comparación de string funciona porque el
// formato YYYY-MM ordena igual que cronológicamente.
if (shopifyApiVersion < "2025-10") {
  throw new Error(
    `SHOPIFY_API_VERSION debe ser "2025-10" o más nueva (recibido "${shopifyApiVersion}"): ` +
      "versiones anteriores traducen productos UNLISTED a ACTIVE y el bot los recomendaría por error.",
  );
}

export const config = {
  // Meta / WhatsApp Cloud API
  META_APP_SECRET: requireEnv("META_APP_SECRET"),
  META_VERIFY_TOKEN: requireEnv("META_VERIFY_TOKEN"),
  META_ACCESS_TOKEN: requireEnv("META_ACCESS_TOKEN"),
  META_PHONE_NUMBER_ID: requireEnv("META_PHONE_NUMBER_ID"),
  META_WABA_ID: optionalEnv("META_WABA_ID", ""),
  META_GRAPH_API_VERSION: optionalEnv("META_GRAPH_API_VERSION", "v23.0"),
  SUPPORT_WHATSAPP_NUMBERS: parseNumberList("SUPPORT_WHATSAPP_NUMBERS"),
  ESCALATION_TEMPLATE_NAME: optionalEnv("ESCALATION_TEMPLATE_NAME", "escalacion_cliente"),
  ESCALATION_TEMPLATE_LANG: optionalEnv("ESCALATION_TEMPLATE_LANG", "es"),

  // Meta / Messenger + Instagram (opcional: el bot arranca sin esto, esos canales
  // simplemente no procesan mensajes hasta que se configuren)
  META_PAGE_ACCESS_TOKEN: optionalEnv("META_PAGE_ACCESS_TOKEN", ""),
  META_PAGE_ID: optionalEnv("META_PAGE_ID", ""),
  INSTAGRAM_ACCOUNT_ID: optionalEnv("INSTAGRAM_ACCOUNT_ID", ""),

  // Usados en el CTA que el bot muestra en Messenger/Instagram para dirigir al cliente
  // a completar su compra por WhatsApp o directo en la tienda.
  PUBLIC_WHATSAPP_NUMBER: optionalEnv("PUBLIC_WHATSAPP_NUMBER", ""),
  STORE_URL: optionalEnv("STORE_URL", "https://viajaligero.pe"),

  // Shopify
  SHOPIFY_SHOP_DOMAIN: requireEnv("SHOPIFY_SHOP_DOMAIN"),
  SHOPIFY_ADMIN_ACCESS_TOKEN: requireEnv("SHOPIFY_ADMIN_ACCESS_TOKEN"),
  SHOPIFY_API_VERSION: shopifyApiVersion,

  // Anthropic
  ANTHROPIC_API_KEY: requireEnv("ANTHROPIC_API_KEY"),
  ANTHROPIC_MODEL: optionalEnv("ANTHROPIC_MODEL", "claude-opus-5"),

  // Base de datos
  DATABASE_URL: requireEnv("DATABASE_URL"),

  // App
  // URL pública donde corre este servicio (sin / al final) — se usa para armar
  // enlaces a imágenes propias (ej. el QR de Yape) que WhatsApp pueda descargar.
  PUBLIC_BASE_URL: requireEnv("PUBLIC_BASE_URL"),
  PORT: optionalInt("PORT", 3000),
  NODE_ENV: optionalEnv("NODE_ENV", "development"),
  INTERNAL_ADMIN_SECRET: requireEnv("INTERNAL_ADMIN_SECRET"),
  INBOX_USERNAME: optionalEnv("INBOX_USERNAME", "admin"),
  INBOX_PASSWORD: optionalEnv("INBOX_PASSWORD", ""),
  CATALOG_CACHE_TTL_MINUTES: optionalInt("CATALOG_CACHE_TTL_MINUTES", 20),
  CONTEXT_WINDOW_HOURS: optionalInt("CONTEXT_WINDOW_HOURS", 12),
  MAX_CONTEXT_MESSAGES: optionalInt("MAX_CONTEXT_MESSAGES", 20),
  ESCALATION_AUTO_RESOLVE_HOURS: optionalInt("ESCALATION_AUTO_RESOLVE_HOURS", 24),
  LOG_LEVEL: optionalEnv("LOG_LEVEL", "info"),
};
