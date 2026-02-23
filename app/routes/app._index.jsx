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

      const endpointMap = {
      "free-gift": "/api/free-gift-discount/activate",
      "flex-discount": "/api/flex-discount/activate",
      "free-gift-by-variant": "/api/free-gift-by-variant/activate",
      "reject-discounts": "/api/reject-discounts/activate",
    };

    try {
        const res = await fetch(endpointMap[discount.type], {
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

  const editRouteMap = {
    "free-gift": (id) => `/app/free-gift?discountId=${id}`,
    "flex-discount": (id) => `/app/flex-discount?discountId=${id}`,
    "free-gift-by-variant": (id) => `/app/free-gift-by-variant?discountId=${id}`,
    "reject-discounts": (id) => `/app/reject-discounts?discountId=${id}`,
  };

  const typeLabelMap = {
    "free-gift": "Free Gift (Cart Threshold)",
    "flex-discount": "Tiered Discount",
    "free-gift-by-variant": "Free Gift (Variant Trigger)",
    "reject-discounts": "Reject Discount",
  };

  return (
    <s-page>
  
      <div style={{ marginBottom: "0.5rem" }}>
          <h1 style={{fontSize: "20px", margin: "0", marginTop: "6px"}}>Create and manage automatic discounts</h1>
      </div>
  
      <div style={{ marginBottom: "1rem",display: "flex", flexDirection: "row", width: "100%", justifyContent: "space-between", maxHeight: "36px" }}>
        <h3 style={{ fontSize: "16px" }}>All Discounts:</h3>
        <s-button href="/app/create" variant="primary" type="button">
            New discount
        </s-button>
      </div>
  
      {discounts && discounts.length > 0 && (
        <s-stack direction="block" gap="loose">
          {discounts.map((discount) => (
            <div key={discount.id} style={{ marginBottom: "1.5rem" }}>
              <s-section>
                <s-card>
                  <div style={{ marginBottom: "1rem" }}>
                    <h3 style={{ fontSize: "16px", margin: "0" }}>{discount.title}</h3>
  
                    <div style={{ marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <s-paragraph>
                        Type: <strong>{typeLabelMap[discount.type]}</strong>
                      </s-paragraph>
  
                      <s-paragraph>
                        Status:{" "}
                        <span
                          style={{
                            display: "inline-block",
                            padding: "2px 12px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 600,
                            backgroundColor:
                              discount.status === "ACTIVE"
                                ? "rgba(34,197,94,0.15)"
                                : "rgba(239,68,68,0.15)",
                            color: discount.status === "ACTIVE" ? "#16a34a" : "#dc2626",
                          }}
                        >
                          {discount.status === "ACTIVE" ? "Active" : "Inactive"}
                        </span>
                      </s-paragraph>
                    </div>
                  </div>
  
                  <s-stack direction="inline" gap="base">
                    <s-button
                      onClick={() => toggleDiscount(discount)}
                      variant="primary"
                      type="button"
                    >
                      {discount.status === "ACTIVE"
                        ? "Deactivate"
                        : "Activate"}
                    </s-button>
  
                    <s-button
                      href={editRouteMap[discount.type](discount.id)}
                      variant="secondary"
                      type="button"
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
