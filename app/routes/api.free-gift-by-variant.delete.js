import { shopifyGraphQLQuery } from "../shopify-graphql.js";

export async function action({ request }) {
  const body = await request.json();
  const { discountId } = body;

  const mutation = `
    mutation deleteDiscount($id: ID!) {
      discountAutomaticDelete(id: $id) {
        userErrors { message }
      }
    }
  `;

  await shopifyGraphQLQuery({
    query: mutation,
    variables: { id: discountId },
    request,
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
