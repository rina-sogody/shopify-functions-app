import { shopifyGraphQLQuery } from "../shopify-graphql.js";
import { discountConfig } from "./api/discountConfig.js";

export async function action({ request }) {
  try {
    const body = await request.json();
    const { discountId, settings, requestedStatus, type } = body;

    const config = discountConfig[type];
    if (!config) throw new Error("Unknown discount type");

    const discountInfo = await getDiscountInfoById(discountId, request);

    const transformedSettings = config.transformSettings(
      settings,
      requestedStatus
    );

    const result = await updateDiscountStatus({
      request,
      appId: discountInfo.appId,
      nodeId: discountId,
      status: requestedStatus || "ACTIVE",
      settings: transformedSettings,
      namespace: config.namespace,
    });

    return Response.json(result);
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function getDiscountInfoById(nodeId, request) {
  const query = `
    query getDiscountInfo($id: ID!) {
      discountNode(id: $id) {
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
    request,
  });

  return { appId: result.data.discountNode.discount.discountId };
}

async function updateDiscountStatus({
  request,
  appId,
  nodeId,
  status,
  settings,
  namespace,
}) {
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
      endsAt: status === "ACTIVE" ? null : new Date().toISOString(),
    },
    metafields: [
      {
        ownerId: nodeId,
        namespace,
        key: "config",
        value: JSON.stringify(settings),
        type: "json",
      },
    ],
  };

  const result = await shopifyGraphQLQuery({ query: mutation, variables, request });

  const userErrors = [
    ...(result.data?.discountAutomaticAppUpdate?.userErrors || []),
    ...(result.data?.metafieldsSet?.userErrors || []),
  ];

  if (userErrors.length) return { success: false, errors: userErrors };
  if (result.errors) return { success: false, errors: result.errors };

  return { success: true };
}