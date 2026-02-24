import { shopifyGraphQLQuery } from "../../shopify-graphql";
import { discountConfig } from "./discountConfig";

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

  return {
    nodeId: node.id,
    discountId: node.discount.discountId,
    title: node.discount.title,
    status: node.discount.status,
    metafield: node.metafield,
  };
}