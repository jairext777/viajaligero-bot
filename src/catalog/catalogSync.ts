import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface CatalogProduct {
  name: string;
  price: string;
  variants: string[];
  description: string;
  link: string;
}

interface CatalogData {
  available: CatalogProduct[];
  hidden: string[];
}

function loadCatalog(): CatalogData {
  const catalogPath = join(__dirname, "../content/catalog.json");
  const raw = readFileSync(catalogPath, "utf-8");
  return JSON.parse(raw) as CatalogData;
}

function formatAvailableLine(product: CatalogProduct): string {
  const variantsText = product.variants.length > 0 ? ` — Variantes: ${product.variants.join(", ")}` : "";
  return `- **${product.name}** — ${product.price}${variantsText} — ${product.description} — ${product.link}`;
}

// Catálogo fijo (la tienda canceló y luego volvió a conectar Shopify, pero el bot ya no
// depende de esa API: el catálogo se mantiene a mano en src/content/catalog.json, igual
// que el FAQ, para no volver a romperse si la tienda cambia de proveedor otra vez).
export async function getCatalogText(): Promise<string> {
  const catalog = loadCatalog();

  const availableBlock =
    catalog.available.length > 0 ? catalog.available.map(formatAvailableLine).join("\n") : "(sin productos disponibles)";
  const hiddenBlock = catalog.hidden.length > 0 ? catalog.hidden.map((name) => `- ${name}`).join("\n") : "(ninguno)";

  return [
    "CATÁLOGO DISPONIBLE PARA RECOMENDAR (los únicos productos que puedes vender/recomendar):",
    availableBlock,
    "",
    "PRODUCTOS NO DISPONIBLES (NO recomendar, NO dar precio ni link; si preguntan por ellos, decir que no está disponible por ahora y ofrecer una alternativa del catálogo disponible):",
    hiddenBlock,
  ].join("\n");
}
