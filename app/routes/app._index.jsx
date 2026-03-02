import { useEffect, useState } from "react";
import { useFetcher, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";

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
      ids: managedDiscounts.map((d) => d.nodeId),
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
      createdAt: managed.createdAt || null,
    };
  })
  .filter(Boolean)
  .sort((a, b) => {
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return { discounts };
};

export default function Index() {
  const { discounts } = useLoaderData();
  const fetcher = useFetcher();

  const [banner, setBanner] = useState(null);

  useEffect(() => {
    if (fetcher.data?.success) {
      setBanner({
        message: "Discount updated successfully",
        tone: "success",
      });
    }
  }, [fetcher.data]);

  async function toggleDiscount(discount) {
    const requestedStatus =
      discount.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const endpointMap = {
      "free-gift": "/api/discount/activate",
      "flex-discount": "/api/discount/activate",
      "free-gift-by-variant": "/api/discount/activate",
      "reject-discounts": "/api/discount/activate",
    };

    const typeMap = {
      "flex-discount": "flex",
      "free-gift": "freeGift",
      "free-gift-by-variant": "freeGiftVariant",
      "reject-discounts": "reject",
    };

    try {
      const res = await fetch(endpointMap[discount.type], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountId: discount.id,
          requestedStatus,
          settings: {},
          type: typeMap[discount.type],
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setBanner({
          message: data.error || "Failed to update discount",
          tone: "critical",
        });
        return;
      }

      window.location.reload();
    } catch (err) {
      console.error(err);
      setBanner({
        message: "Failed to update discount",
        tone: "critical",
      });
    }
  }

  const editRouteMap = {
    "free-gift": (id) => `/app/free-gift?discountId=${id}`,
    "flex-discount": (id) => `/app/flex-discount?discountId=${id}`,
    "free-gift-by-variant": (id) =>
      `/app/free-gift-by-variant?discountId=${id}`,
    "reject-discounts": (id) =>
      `/app/reject-discounts?discountId=${id}`,
  };

  const typeLabelMap = {
    "free-gift": "Free Gift (Cart Threshold)",
    "flex-discount": "Tiered Discount",
    "free-gift-by-variant": "Free Gift (Variant Trigger)",
    "reject-discounts": "Reject Discount",
  };

  return (
    <s-page>

      {banner && (
        <div style={{ marginBottom: "16px" }}>
          <s-banner
            tone={banner.tone}
            dismissible
            onDismiss={() => setBanner(null)}
          >
            {banner.message}
          </s-banner>
        </div>
      )}

      <div style={{ marginBottom: "0.5rem" }}>
        <h1 style={{ fontSize: "20px", margin: "0", marginTop: "6px" }}>
          Create and manage automatic discounts
        </h1>
      </div>

      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          flexDirection: "row",
          width: "100%",
          justifyContent: "space-between",
          maxHeight: "36px",
        }}
      >
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
                    <h3 style={{ fontSize: "16px", margin: "0" }}>
                      {discount.title}
                    </h3>

                    <div
                      style={{
                        marginTop: "0.5rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <s-paragraph>
                        Type:{" "}
                        <strong>{typeLabelMap[discount.type]}</strong>
                      </s-paragraph>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row",
                          gap: "10px",
                        }}
                      >
                        <s-paragraph>Status: </s-paragraph>
                        <s-badge
                          tone={
                            discount.status === "ACTIVE"
                              ? "success"
                              : "info"
                          }
                        >
                          {discount.status === "ACTIVE"
                            ? "Active"
                            : "Inactive"}
                        </s-badge>
                      </div>
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
                      href={editRouteMap[discount.type](
                        discount.id
                      )}
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