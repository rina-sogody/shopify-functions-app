import { shopifyGraphQLQuery } from "../shopify-graphql.js";

export async function action({ request }) {
  try {
    const body = await request.json();
    const { discountId, settings, requestedStatus } = body;

    const discountInfo = await getDiscountInfoById(discountId, request);

    const mutation = `
      mutation updateDiscount($id: ID!, $input: DiscountAutomaticAppInput!, $metafields: [MetafieldsSetInput!]!) {
        discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $input) {
          userErrors { message }
        }
        metafieldsSet(metafields: $metafields) {
          userErrors { message }
        }
      }
    `;

    const variables = {
      id: discountInfo.appId,
      input: {
        endsAt: requestedStatus === "ACTIVE" ? null : new Date().toISOString(),
      },
      metafields: [
        {
          ownerId: discountId,
          namespace: "free-gift-by-variant",
          key: "config",
          type: "json",
          value: JSON.stringify(settings),
        },
      ],
    };

    const result = await shopifyGraphQLQuery({
      query: mutation,
      variables,
      request,
    });

    // ✅ Check for GraphQL errors
    if (result.errors) {
      return new Response(
        JSON.stringify({ success: false, errors: result.errors }),
        { status: 500 }
      );
    }

    const userErrors = [
      ...(result.data?.discountAutomaticAppUpdate?.userErrors || []),
      ...(result.data?.metafieldsSet?.userErrors || []),
    ];

    if (userErrors.length > 0) {
      return new Response(
        JSON.stringify({ success: false, errors: userErrors }),
        { status: 400 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}

async function getDiscountInfoById(nodeId, request) {
  const query = `
    query getDiscountInfo($id: ID!) {
      discountNode(id: $id) {
        discount {
          ... on DiscountAutomaticApp {
            discountId
          }
        }
      }
    }
  `;

  const result = await shopifyGraphQLQuery({
    query,
    variables: { id: nodeId },
    request,
  });

  return {
    appId: result.data.discountNode.discount.discountId,
  };
}
