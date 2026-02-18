import { shopifyGraphQLQuery } from "../shopify-graphql.js";

export async function action({ request }) {
  try {
    const body = await request.json();
    const { title, settings } = body;

    if (!title) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing discount title" }),
        { status: 400 }
      );
    }

    const createResult = await createAppDiscount({ request, title });

    await saveDiscountSettings({
      request,
      nodeId: createResult.nodeId,
      settings
    });

    await registerDiscountOnAppInstallation({
      request,
      discount: {
        nodeId: createResult.nodeId,
        title,
      },
    });    

    return new Response(
      JSON.stringify({
        success: true,
        discount: createResult
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Create discount error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
}

async function createAppDiscount({ request, title }) {
  const mutation = `
    mutation createDiscount($input: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $input) {
        automaticAppDiscount {
          discountId
          title
        }
        userErrors { message }
      }
    }
  `;

  const result = await shopifyGraphQLQuery({
    query: mutation,
    variables: {
      input: {
        title,
        functionHandle: "flex-discount",
        discountClasses: ["PRODUCT"],
        startsAt: new Date().toISOString()
      }
    },
    request
  });

  console.log("CREATE DISCOUNT RESULT:", JSON.stringify(result, null, 2));

  if (result.errors) {
    throw new Error(result.errors[0]?.message || "GraphQL error");
  }

  if (!result.data?.discountAutomaticAppCreate) {
    throw new Error("Unexpected GraphQL response from Shopify");
  }

  const payload = result.data.discountAutomaticAppCreate;

  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors[0].message);
  }

  const nodeId = payload.automaticAppDiscount.discountId;

  return {
    appId: payload.automaticAppDiscount.id,
    nodeId
  };
}


async function saveDiscountSettings({ request, nodeId, settings }) {
  const mutation = `
    mutation saveConfig($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { message }
      }
    }
  `;

  await shopifyGraphQLQuery({
    query: mutation,
    variables: {
      metafields: [{
        ownerId: nodeId,
        namespace: "flex-discount",
        key: "config",
        type: "json",
        value: JSON.stringify({
          tiers: settings.tiers,
          eligibleSkus: settings.eligibleSkus
        })                
      }]
    },
    request
  });
}


async function registerDiscountOnAppInstallation({ request, discount }) {
  const appInstallQuery = `
    query {
      currentAppInstallation {
        id
        metafield(namespace: "app", key: "managed_discounts") {
          id
          value
        }
      }
    }
  `;

  const appInstallResult = await shopifyGraphQLQuery({
    query: appInstallQuery,
    request,
  });

  const installation = appInstallResult.data.currentAppInstallation;

  if (!installation) {
    throw new Error("App installation not found");
  }

  let discounts = [];

  if (installation.metafield?.value) {
    try {
      discounts = JSON.parse(installation.metafield.value).discounts || [];
    } catch {
      discounts = [];
    }
  }

  discounts.push({
    nodeId: discount.nodeId,
    title: discount.title,
    type: "flex-discount",
    createdAt: new Date().toISOString(),
  });

  const saveMutation = `
    mutation saveAppDiscounts($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors { message }
      }
    }
  `;

  await shopifyGraphQLQuery({
    query: saveMutation,
    variables: {
      metafields: [
        {
          ownerId: installation.id,
          namespace: "app",
          key: "managed_discounts",
          type: "json",
          value: JSON.stringify({ discounts }),
        },
      ],
    },
    request,
  });
}
