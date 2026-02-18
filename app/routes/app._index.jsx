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
  .map((node, index) => {
    if (!node) return null;

    const managed = managedDiscounts[index];

    return {
      id: node.id,
      title: node.automaticDiscount.title,
      status: node.automaticDiscount.status,
      type: managed.type,  
    };
  })
  .filter(Boolean);


  return { discounts };
};

export default function Index() {
  const { discounts } = useLoaderData();
  const fetcher = useFetcher();
  const shopify = useAppBridge();

  useEffect(() => {
    if (fetcher.data?.success) {
      shopify.toast.show("Discount updated successfully");
    }
  }, [fetcher.data, shopify]);

  async function toggleDiscount(discount) {
    const requestedStatus =
      discount.status === "ACTIVE" ? "DEACTIVE" : "ACTIVE";

    try {
      const res = await fetch(
        discount.type === "free-gift"
          ? "/api/free-gift-discount/activate"
          : "/api/flex-discount/activate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            discountId: discount.id,
            requestedStatus,
            settings: {},
          }),
        }
      );

      const data = await res.json();

      if (!data.success) {
        shopify.toast.show(data.error || "Failed to update discount");
        return;
      }

      window.location.reload();
    } catch (err) {
      console.error(err);
      shopify.toast.show("Failed to update discount");
    }
  }

  return (
    <s-page heading="Discounts">
  
      {/* CREATE SECTION */}
      <div style={{ marginBottom: "2.5rem" }}>
        <s-section heading="Create a new discount">
          <s-paragraph>
            Create and manage automatic discounts powered by your app.
          </s-paragraph>
  
          <div style={{ marginTop: "1.25rem" }}>
            <s-button href="/app/create" variant="primary">
              Create discount
            </s-button>
          </div>
        </s-section>
      </div>
  
      <div style={{ marginBottom: "1.25rem" }}>
        <s-heading>Your Discounts</s-heading>
      </div>
  
      {discounts && discounts.length > 0 && (
        <s-stack direction="block" gap="loose">
          {discounts.map((discount) => (
            <div key={discount.id} style={{ marginBottom: "1.5rem" }}>
              <s-section>
                <s-card>
                  <div style={{ marginBottom: "1rem" }}>
                    <s-heading>{discount.title}</s-heading>
  
                    <div style={{ marginTop: "0.5rem" }}>
                      <s-paragraph>
                        Type:{" "}
                        <strong>
                          {discount.type === "free-gift"
                            ? "Free Gift"
                            : "Tiered Discount"}
                        </strong>
                      </s-paragraph>
  
                      <s-paragraph>
                        Status:{" "}
                        <strong
                          style={{
                            color:
                              discount.status === "ACTIVE"
                                ? "green"
                                : "var(--p-color-text-secondary)",
                          }}
                        >
                          {discount.status === "ACTIVE"
                            ? "Active"
                            : "Inactive"}
                        </strong>
                      </s-paragraph>
                    </div>
                  </div>
  
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
                      href={
                        discount.type === "free-gift"
                          ? `/app/free-gift?discountId=${discount.id}`
                          : `/app/flex-discount?discountId=${discount.id}`
                      }
                      variant="tertiary"
                    >
                      Edit
                    </s-button>
                  </s-stack>
                </s-card>
              </s-section>
            </div>
          ))}
        </s-stack>
      )}
  
      {discounts.length === 0 && (
        <div style={{ marginTop: "1rem" }}>
          <s-card>
            <div style={{ padding: "1rem 0" }}>
              <s-paragraph>
                You currently don’t have any discounts.
              </s-paragraph>
            </div>
          </s-card>
        </div>
      )}
  
    </s-page>
  );
  
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
