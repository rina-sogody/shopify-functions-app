import { useEffect } from "react";
import { useFetcher } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { useLoaderData } from "react-router";


export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const appInstallQuery = `
    query {
      currentAppInstallation {
        metafield(namespace: "app", key: "managed_discounts") {
          value
        }
      }
    }
  `;

  const appInstallRes = await admin.graphql(appInstallQuery);
  const appInstallJson = await appInstallRes.json();

  let managedDiscounts = [];

  const rawValue =
    appInstallJson.data.currentAppInstallation.metafield?.value;

  if (rawValue) {
    try {
      managedDiscounts = JSON.parse(rawValue).discounts || [];
    } catch {
      managedDiscounts = [];
    }
  }

  if (managedDiscounts.length === 0) {
    return { discounts: [] };
  }

  const discountNodesQuery = `
    query getDiscounts($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on DiscountAutomaticNode {
          id
          automaticDiscount {
            ... on DiscountAutomaticApp {
              title
              status
            }
          }
        }
      }
    }
  `;

  const discountRes = await admin.graphql(discountNodesQuery, {
    variables: {
      ids: managedDiscounts.map(d => d.nodeId),
    },
  });

  const discountJson = await discountRes.json();

  const discounts = discountJson.data.nodes
    .filter(Boolean)
    .map(node => ({
      id: node.id,
      title: node.automaticDiscount.title,
      status: node.automaticDiscount.status,
    }));

  return { discounts };
};

export default function Index() {
  const { discounts } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Discount created successfully");
    }
  }, [fetcher.data, shopify]);

  async function toggleDiscount(discount) {
    const requestedStatus =
      discount.status === "ACTIVE" ? "DEACTIVE" : "ACTIVE";
  
    try {
      const res = await fetch("/api/free-gift-discount/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountId: discount.id,
          requestedStatus,
          settings: {},
        }),
      });
  
      const data = await res.json();
  
      if (!data.success) {
        alert(data.error || "Failed to update discount");
        return;
      }
  
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Failed to update discount");
    }
  }
  

  return (
    <s-page heading="Discounts">
      <s-button
        slot="primary-action"
        href="/app/free-gift"
      >
        Create discount
      </s-button>

      <s-section heading="Create a new discount">
        <s-paragraph>
          Create and manage automatic discounts powered by your app.
        </s-paragraph>

        <s-stack direction="block" gap="base">
          <s-card>
            <s-button href="/app/free-gift">
              Create discount
            </s-button>
          </s-card>
        </s-stack>
      </s-section>

      {discounts && discounts.length > 0 && (
        <s-section heading="Your discounts">
          <s-stack direction="block" gap="base">
            {discounts.map((discount) => (
              <s-card key={discount.id}>
                <s-heading>{discount.title}</s-heading>

                <s-paragraph>
                  Status:{" "}
                  <strong>
                    {discount.status === "ACTIVE"
                      ? "Active ✅"
                      : "Inactive ❌"}
                  </strong>
                </s-paragraph>

                <s-stack direction="inline" gap="base">
                  <s-button
                    onClick={() => toggleDiscount(discount)}
                    variant={
                      discount.status === "ACTIVE"
                        ? "secondary"
                        : "primary"
                    }
                  >
                    {discount.status === "ACTIVE"
                      ? "Deactivate"
                      : "Activate"}
                  </s-button>

                  <s-button
                    href={`/app/free-gift?discountId=${discount.id}`}
                    variant="tertiary"
                  >
                    Edit
                  </s-button>
                  
                </s-stack>
              </s-card>
            ))}
          </s-stack>
        </s-section>
      )}


    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
