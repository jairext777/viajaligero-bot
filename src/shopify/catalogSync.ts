import { shopifyGraphql } from "./shopifyClient.js";
import type { ShopifyProduct, ShopifyProductsResponse } from "./catalog.types.js";
import { config } from "../config/env.js";

const CATALOG_QUERY = `
  query CatalogSync($cursor: String) {
    products(first: 50, after: $cursor, sortKey: TITLE) {
      edges {
        node {
          id
          title
          status
          onlineStoreUrl
          descriptionHtml
          priceRangeV2 {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          variants(first: 25) {
            edges { node { title price } }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];
  let cursor: string | undefined;

  for (;;) {
    const data = await shopifyGraphql<ShopifyProductsResponse>(CATALOG_QUERY, { cursor });
    products.push(...data.products.edges.map((edge) => edge.node));
    if (!data.products.pageInfo.hasNextPage) break;
    cursor = data.products.pageInfo.endCursor ?? undefined;
  }

  return products;
}

function stripHtmlAndTruncate(html: string, maxLength: number): string {
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function formatPrice(product: ShopifyProduct): string {
  const { minVariantPrice, maxVariantPrice } = product.priceRangeV2;
  const currency = minVariantPrice.currencyCode;
  if (minVariantPrice.amount === maxVariantPrice.amount) {
    return `${currency} ${minVariantPrice.amount}`;
  }
  return `Desde ${currency} ${minVariantPrice.amount}`;
}

function isRecommendable(product: ShopifyProduct): boolean {
  return product.status === "ACTIVE";
}

function formatAvailableLine(product: ShopifyProduct): string {
  const price = formatPrice(product);
  const variantTitles = product.variants.edges.map((edge) => edge.node.title);
  const hasRealVariants = variantTitles.length > 1 || variantTitles[0] !== "Default Title";
  const variantsText = hasRealVariants ? ` — Variantes: ${variantTitles.join(", ")}` : "";
  const description = stripHtmlAndTruncate(product.descriptionHtml, 140);
  const link = product.onlineStoreUrl ?? "";
  return `- **${product.title}** — ${price}${variantsText} — ${description} — ${link}`;
}

function formatCatalogForPrompt(products: ShopifyProduct[]): string {
  const available = products.filter(isRecommendable);
  const hidden = products.filter((p) => !isRecommendable(p));

  const availableBlock = available.length > 0 ? available.map(formatAvailableLine).join("\n") : "(sin productos disponibles)";
  const hiddenBlock = hidden.length > 0 ? hidden.map((p) => `- ${p.title}`).join("\n") : "(ninguno)";

  return [
    "CATÁLOGO DISPONIBLE PARA RECOMENDAR (los únicos productos que puedes vender/recomendar):",
    availableBlock,
    "",
    "PRODUCTOS NO DISPONIBLES (NO recomendar, NO dar precio ni link; si preguntan por ellos, decir que no está disponible por ahora y ofrecer una alternativa del catálogo disponible):",
    hiddenBlock,
  ].join("\n");
}

let cache: { text: string; fetchedAt: number } | null = null;

export async function refreshCatalog(): Promise<string> {
  const products = await fetchAllProducts();
  const text = formatCatalogForPrompt(products);
  cache = { text, fetchedAt: Date.now() };
  return text;
}

export async function getCatalogText(): Promise<string> {
  const ttlMs = config.CATALOG_CACHE_TTL_MINUTES * 60_000;
  if (cache && Date.now() - cache.fetchedAt < ttlMs) {
    return cache.text;
  }
  return refreshCatalog();
}
