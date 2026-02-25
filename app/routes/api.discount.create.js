import { shopifyGraphQLQuery } from "../shopify-graphql.js";
import { discountConfig } from "./api/discountConfig.js";

export async function action({ request }) {
  try {
    const body = await request.json();
    const { title, settings, type } = body;

    const config = discountConfig[type];
    if (!config) throw new Error("Unknown discount type");

    if (!title?.trim()) {
      return Response.json({ success: false, error: "Title required" }, { status: 400 });
    }

    const createResult = await createAppDiscount({
      request,
      title,
      config,
    });

    const transformedSettings = config.transformSettings(settings);

    await saveDiscountSettings({
      request,
      nodeId: createResult.nodeId,
      namespace: config.namespace,
      settings: transformedSettings,
    });

    await registerDiscountOnAppInstallation({
      request,
      discount: {
        nodeId: createResult.nodeId,
        title,
        type: config.registrationType,
      },
    });

    return Response.json({ success: true, discount: createResult });
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function createAppDiscount({ request, title, config }) {
  const mutation = `
    mutation createDiscount($input: DiscountAutomaticAppInput!) {
      discountAutomaticAppCreate(automaticAppDiscount: $input) {
        automaticAppDiscount { discountId }
        userErrors { message }
      }
    }
  `;

  const result = await shopifyGraphQLQuery({
    query: mutation,
    variables: {
      input: {
        title,
        functionHandle: config.functionHandle,
        discountClasses: config.discountClasses,
        startsAt: new Date().toISOString(),
      },
    },
    request,
  });

  const payload = result.data.discountAutomaticAppCreate;
  if (payload.userErrors?.length) throw new Error(payload.userErrors[0].message);

  return { nodeId: payload.automaticAppDiscount.discountId };
}

async function saveDiscountSettings({ request, nodeId, namespace, settings }) {
  await shopifyGraphQLQuery({
    query: `
      mutation saveConfig($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { userErrors { message } }
      }
    `,
    variables: {
      metafields: [
        {
          ownerId: nodeId,
          namespace,
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
  const result = await shopifyGraphQLQuery({
    query: `
      query {
        currentAppInstallation {
          id
          metafield(namespace: "app", key: "managed_discounts") { value }
        }
      }
    `,
    request,
  });

  const installation = result.data.currentAppInstallation;

  let discounts = [];
  if (installation.metafield?.value) {
    discounts = JSON.parse(installation.metafield.value).discounts || [];
  }

  discounts.push({ ...discount, createdAt: new Date().toISOString() });

  await shopifyGraphQLQuery({
    query: `
      mutation save($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) { userErrors { message } }
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