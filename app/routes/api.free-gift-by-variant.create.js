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
      settings,
    });

    await registerDiscountOnAppInstallation({
      request,
      discount: {
        nodeId: createResult.nodeId,
        title,
      },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
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
        functionHandle: "free-gift-by-variant",
        discountClasses: ["PRODUCT"],
        startsAt: new Date().toISOString(),
      },
    },
    request,
  });

  const payload = result.data.discountAutomaticAppCreate;

  if (payload.userErrors?.length) {
    throw new Error(payload.userErrors[0].message);
  }

  return {
    nodeId: payload.automaticAppDiscount.discountId,
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
      metafields: [
        {
          ownerId: nodeId,
          namespace: "free-gift-by-variant",
          key: "config",
          type: "json",
          value: JSON.stringify(settings),
        },
      ],
    },
    request,
  });
}

async function registerDiscountOnAppInstallation({ request, discount }) {
  const query = `
    query {
      currentAppInstallation {
        id
        metafield(namespace: "app", key: "managed_discounts") {
          value
        }
      }
    }
  `;

  const result = await shopifyGraphQLQuery({ query, request });
  const installation = result.data.currentAppInstallation;

  let discounts = [];

  if (installation.metafield?.value) {
    discounts = JSON.parse(installation.metafield.value).discounts || [];
  }

  discounts.push({
    nodeId: discount.nodeId,
    title: discount.title,
    type: "free-gift-by-variant",
    createdAt: new Date().toISOString(),
  });

  const saveMutation = `
    mutation save($metafields: [MetafieldsSetInput!]!) {
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
