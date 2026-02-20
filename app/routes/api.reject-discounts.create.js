import { shopifyGraphQLQuery } from "../shopify-graphql.js";

export async function action({ request }) {
  try {
    const body = await request.json();
    const { title } = body;

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
    });

    await registerDiscountOnAppInstallation({
      request,
      discount: {
        nodeId: createResult.nodeId,
        title,
      },
    });

    return new Response(
      JSON.stringify({ success: true, discount: createResult }),
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
        functionHandle: "reject-discounts",
        discountClasses: ["PRODUCT", "ORDER"],
        startsAt: new Date().toISOString(),
      },
    },
    request,
  });

  const payload = result.data.discountAutomaticAppCreate;

  if (payload.userErrors?.length) throw new Error(payload.userErrors[0].message);

  return {
    nodeId: payload.automaticAppDiscount.discountId,
  };
}

async function saveDiscountSettings({ request, nodeId }) {
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
      metafields: [
        {
          ownerId: nodeId,
          namespace: "reject-discounts",
          key: "config",
          type: "json",
          value: JSON.stringify({ enabled: false }),
        },
      ],
    },
    request,
  });
}

async function registerDiscountOnAppInstallation({ request, discount }) {
  const appInstallQuery = `
    query {
      currentAppInstallation {
        id
        metafield(namespace: "app", key: "managed_discounts") {
          value
        }
      }
    }
  `;

  const appInstallResult = await shopifyGraphQLQuery({ query: appInstallQuery, request });

  const installation = appInstallResult.data.currentAppInstallation;

  let discounts = [];

  if (installation.metafield?.value) {
    discounts = JSON.parse(installation.metafield.value).discounts || [];
  }

  discounts.push({
    nodeId: discount.nodeId,
    title: discount.title,
    type: "reject-discounts",
    createdAt: new Date().toISOString(),
  });

  await shopifyGraphQLQuery({
    query: `
      mutation saveAppDiscounts($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { message }
        }
      }
    `,
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