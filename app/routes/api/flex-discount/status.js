import { shopifyGraphQLQuery } from "../../../shopify-graphql";

export async function getStatus({ request, discountId }) {
  if (!discountId) {
    return null;
  }

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
        metafield(namespace: "flex-discount", key: "config") {
          value
        }
      }
    }
    `;

  const result = await shopifyGraphQLQuery({ query, variables: { id: discountId }, request });

  const node = result.data?.discountNode;

  if (!node || !node.discount) {
    return null;
  }

  return {
    nodeId: node.id,
    discountId: node.discount.discountId,
    title: node.discount.title,
    status: node.discount.status,
    metafield: node.metafield,
  };
}
