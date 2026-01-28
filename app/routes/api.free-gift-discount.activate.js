import { shopifyGraphQLQuery } from "../shopify-graphql.js";

export async function action({ request }) {
  try {
    const body = await request.json();
    const { discountId, settings, requestedStatus } = body;

    const discountInfo = await getDiscountInfoById(discountId, request);

    const functionSettings = {
      threshold: settings.CART_TOTAL_THRESHOLD || 30000,
      sku: settings.FREE_GIFT_SKU || ""
    };

    const result = await updateDiscountStatus({
      request,
      appId: discountInfo.appId,
      nodeId: discountId,
      status: requestedStatus || "ACTIVE",
      settings: functionSettings
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Backend Error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function getDiscountInfoById(nodeId, request) {
  const query = `
    query getDiscountInfo($id: ID!) {
      discountNode(id: $id) {
        id
        discount {
          __typename
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
    request
  });

  const discount = result.data?.discountNode?.discount;

  if (!discount) {
    return { error: "DISCOUNT_NOT_FOUND" };
  }

  if (discount.__typename !== "DiscountAutomaticApp") {
    return {
      error: "NOT_APP_DISCOUNT",
      type: discount.__typename
    };
  }

  return {
    appId: discount.discountId
  };
}


async function updateDiscountStatus({ request, appId, nodeId, status, settings }) {
  const mutation = `
    mutation updateDiscount($id: ID!, $input: DiscountAutomaticAppInput!, $metafields: [MetafieldsSetInput!]!) {
      discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $input) {
        userErrors { field message }
      }
      metafieldsSet(metafields: $metafields) {
        userErrors { field message }
      }
    }
  `;

  const variables = {
    id: appId, 
    input: {
      endsAt: status === "ACTIVE" ? null : new Date().toISOString()
    },
    metafields: [
      {
        ownerId: nodeId, 
        namespace: "free-gift",
        key: "config",
        value: JSON.stringify(settings),
        type: "json"
      }
    ]
  };

  const result = await shopifyGraphQLQuery({ query: mutation, variables, request });

  const userErrors = [
    ...(result.data?.discountAutomaticAppUpdate?.userErrors || []),
    ...(result.data?.metafieldsSet?.userErrors || [])
  ];

  if (userErrors.length > 0) return { success: false, errors: userErrors };
  if (result.errors) return { success: false, errors: result.errors };

  return { success: true };
}