import { config } from "../config/env.js";

export async function shopifyGraphql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(
    `https://${config.SHOPIFY_SHOP_DOMAIN}/admin/api/${config.SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": config.SHOPIFY_ADMIN_ACCESS_TOKEN,
      },
      body: JSON.stringify({ query, variables }),
    },
  );

  if (!response.ok) {
    throw new Error(`Shopify API error ${response.status}: ${await response.text()}`);
  }

  const json = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors && json.errors.length > 0) {
    throw new Error(`Shopify GraphQL error: ${json.errors.map((e) => e.message).join("; ")}`);
  }
  if (!json.data) {
    throw new Error("Shopify GraphQL response missing data");
  }
  return json.data;
}
