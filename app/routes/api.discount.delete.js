import { shopifyGraphQLQuery } from "../shopify-graphql.js";

export async function action({ request }) {
  try {
    const { discountId } = await request.json();

    if (!discountId) {
      return Response.json(
        { success: false, error: "Missing discountId" },
        { status: 400 }
      );
    }

    await deleteDiscount({ request, discountId });
    await removeFromAppInstallation({ request, discountId });

    return Response.json({ success: true });
  } catch (err) {
    return Response.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

async function deleteDiscount({ request, discountId }) {
  const mutation = `
    mutation discountDelete($id: ID!) {
      discountAutomaticDelete(id: $id) {
        userErrors { message }
      }
    }
  `;

  const result = await shopifyGraphQLQuery({
    query: mutation,
    variables: { id: discountId },
    request,
  });

  const errors = result.data?.discountAutomaticDelete?.userErrors;
  if (errors?.length) throw new Error(errors[0].message);
}

async function removeFromAppInstallation({ request, discountId }) {
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
  if (!installation) return;

  let discounts = [];
  if (installation.metafield?.value) {
    discounts = JSON.parse(installation.metafield.value).discounts || [];
  }

  const updated = discounts.filter(d => d.nodeId !== discountId);

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
          value: JSON.stringify({ discounts: updated }),
        },
      ],
    },
    request,
  });
}