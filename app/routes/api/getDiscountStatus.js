import { shopifyGraphQLQuery } from "../../shopify-graphql";
import { discountConfig } from "./discountConfig";

function parseJsonSafely(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeVariantId(value) {
  if (!value) return null;
  const raw = String(value);
  if (raw.startsWith("gid://")) return raw;
  if (/^\d+$/.test(raw)) return `gid://shopify/ProductVariant/${raw}`;
  return raw;
}

async function hydrateFlexSettings({ request, settings }) {
  if (!settings || typeof settings !== "object") return null;

  const eligibleSkus = Array.isArray(settings.eligibleSkus)
    ? settings.eligibleSkus
    : [];

  const variantIds = [...new Set(
    eligibleSkus
      .map((entry) => normalizeVariantId(entry?.variantId || entry?.id))
      .filter(Boolean)
  )];

  let variantsById = new Map();

  if (variantIds.length > 0) {
    const variantsResult = await shopifyGraphQLQuery({
      query: `
        query getVariants($ids: [ID!]!) {
          nodes(ids: $ids) {
            ... on ProductVariant {
              id
              title
              sku
              image {
                url
              }
              product {
                id
                title
                featuredImage {
                  url
                }
              }
            }
          }
        }
      `,
      variables: { ids: variantIds },
      request,
    });

    variantsById = new Map(
      (variantsResult?.data?.nodes || [])
        .filter(Boolean)
        .map((variant) => [variant.id, variant])
    );
  }

  const hydratedEligibleSkus = eligibleSkus
    .map((entry) => {
      if (!entry) return null;

      if (typeof entry === "string") {
        const sku = entry.trim();
        return sku
          ? {
              sku,
              variantId: null,
              productId: null,
              title: "",
              productTitle: "",
              image: null,
            }
          : null;
      }

      if (typeof entry !== "object") return null;

      const variantId = normalizeVariantId(entry.variantId || entry.id);
      const variant = variantId ? variantsById.get(variantId) : null;
      const sku =
        typeof entry.sku === "string" && entry.sku.trim()
          ? entry.sku.trim()
          : variant?.sku || null;

      if (!sku && !variantId) return null;

      return {
        sku,
        variantId,
        productId: entry.productId || variant?.product?.id || null,
        title: entry.title || variant?.title || "",
        productTitle: entry.productTitle || variant?.product?.title || "",
        image:
          entry.image ||
          variant?.image?.url ||
          variant?.product?.featuredImage?.url ||
          null,
      };
    })
    .filter(Boolean);

  return {
    ...settings,
    eligibleSkus: hydratedEligibleSkus,
  };
}

export async function getDiscountStatus({
  request,
  discountId,
  type,
}) {
  if (!discountId) return null;

  const config = discountConfig[type];
  if (!config) throw new Error(`Unknown discount type: ${type}`);

  const query = `
    query getDiscount($id: ID!) {
      discountNode(id: $id) {
        id
        discount {
          ... on DiscountAutomaticApp {
            discountId
            title
            status
          }
        }
        metafield(namespace: "${config.namespace}", key: "config") {
          value
        }
      }
    }
  `;

  const result = await shopifyGraphQLQuery({
    query,
    variables: { id: discountId },
    request,
  });

  const node = result.data?.discountNode;
  if (!node || !node.discount) return null;

  const rawSettings = parseJsonSafely(node.metafield?.value);
  const hydratedSettings =
    type === "flex"
      ? await hydrateFlexSettings({ request, settings: rawSettings })
      : rawSettings;

  return {
    nodeId: node.id,
    discountId: node.discount.discountId,
    title: node.discount.title,
    status: node.discount.status,
    metafield: node.metafield,
    hydratedSettings,
  };
}
