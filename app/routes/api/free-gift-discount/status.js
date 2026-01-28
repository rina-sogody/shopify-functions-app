import { shopifyGraphQLQuery } from "../../../shopify-graphql";

export async function getStatus({ request }) {
  try {
    const query = `
      {
        discountNodes(first: 50) {
          edges {
            node {
              id
              discount {
                ... on DiscountAutomaticApp {
                  discountId
                  title
                  status
                  appDiscountType {
                    functionId
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = await shopifyGraphQLQuery({ query, variables: null, request });

    const edges = result.data.discountNodes.edges || [];
    const discount = edges.find(edge => edge.node.discount.title === "Free Gift Discount")?.node;

    if (!discount) return null

    return discount;
  } catch (err) {
    console.error("Error fetching discount status:", err);
  }
}
