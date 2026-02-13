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
        metafield(namespace: "free-gift", key: "config") {
          value
        }
      }
    }
    `;

  const result = await shopifyGraphQLQuery({ query, variables: { id: discountId }, request });

  const node = result.data?.discountNode;

  if (!node || !node.automaticDiscount) {
    return null;
  }

  return {
    nodeId: node.id,
    discountId: node.automaticDiscount.discountId,
    title: node.automaticDiscount.title,
    status: node.automaticDiscount.status,
    metafield: node.metafield,
  };
}
