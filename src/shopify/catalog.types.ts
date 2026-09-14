export interface ShopifyMoney {
  amount: string;
  currencyCode: string;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  status: "ACTIVE" | "ARCHIVED" | "DRAFT" | "UNLISTED";
  onlineStoreUrl: string | null;
  descriptionHtml: string;
  priceRangeV2: {
    minVariantPrice: ShopifyMoney;
    maxVariantPrice: ShopifyMoney;
  };
  variants: {
    edges: Array<{ node: { title: string; price: string } }>;
  };
}

export interface ShopifyProductsResponse {
  products: {
    edges: Array<{ node: ShopifyProduct }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}
