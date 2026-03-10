/* eslint-disable no-undef */
import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { showToast } from "../utils/toast";

const TYPE_MAP = {
  "flex-discount": "flex",
  "free-gift": "freeGift",
  "free-gift-by-variant": "freeGiftVariant",
  "reject-discounts": "reject",
};

const TYPE_LABEL_MAP = {
  "free-gift": "Free Gift (Cart Threshold)",
  "flex-discount": "Tiered Discount",
  "free-gift-by-variant": "Free Gift (Variant Trigger)",
  "reject-discounts": "Reject Discount",
};

const EDIT_ROUTE_MAP = {
  "free-gift": (id) => `/app/free-gift?discountId=${id}`,
  "flex-discount": (id) => `/app/flex-discount?discountId=${id}`,
  "free-gift-by-variant": (id) => `/app/free-gift-by-variant?discountId=${id}`,
  "reject-discounts": (id) => `/app/reject-discounts?discountId=${id}`,
};

const DISCOUNT_TYPES = [
  {
    id: "free-gift",
    title: "Free Gift (Cart Threshold)",
    description: "Automatically add a free product when cart total exceeds a threshold.",
    route: "/app/free-gift",
  },
  {
    id: "free-gift-by-variant",
    title: "Free Gift (Variant Trigger)",
    description: "Add a free gift when a specific product variant is in the cart.",
    route: "/app/free-gift-by-variant",
  },
  {
    id: "flex-discount",
    title: "Tiered Discount",
    description: "Apply percentage discounts based on cart spend thresholds.",
    route: "/app/flex-discount",
  },
  {
    id: "reject-discounts",
    title: "Reject Discounts",
    description: "Block all discount codes at checkout during campaigns.",
    route: "/app/reject-discounts",
  },
];

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
  const rawValue = appInstallJson.data.currentAppInstallation.metafield?.value;

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
  const navigate = useNavigate();

  const [rows, setRows] = useState(discounts);
  const [pendingId, setPendingId] = useState(null);

  async function toggleDiscount(discount) {
    const requestedStatus = discount.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    setPendingId(discount.id);

    try {
      const res = await fetch("/api/discount/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountId: discount.id,
          requestedStatus,
          settings: {},
          type: TYPE_MAP[discount.type],
        }),
      });

      const data = await res.json();

      if (!data.success) {
        showToast(data.error || "Failed to update discount", "critical");
        return;
      }

      setRows((prev) =>
        prev.map((row) =>
          row.id === discount.id ? { ...row, status: requestedStatus } : row
        )
      );

      showToast(
        requestedStatus === "ACTIVE" ? "Discount activated" : "Discount deactivated",
        "success"
      );
    } catch (err) {
      console.error(err);
      showToast("Failed to update discount", "critical");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <s-page heading="Discounts">
      <s-button slot="primary-action" variant="primary" commandFor="create-discount-modal" command="--show">
        Create discount
      </s-button>

      <s-modal id="create-discount-modal" heading="Create a new discount">
        <s-stack gap="base">
          <s-paragraph>Choose the type of discount you want to create:</s-paragraph>

          {DISCOUNT_TYPES.map((type) => (
            <s-section key={type.id} heading={type.title}>
              <s-stack gap="base">
                <s-paragraph>{type.description}</s-paragraph>
                <s-button
                  variant="primary"
                  onClick={() => navigate(type.route)}
                  commandFor="create-discount-modal"
                  command="--hide"
                >
                  Create
                </s-button>
              </s-stack>
            </s-section>
          ))}
        </s-stack>

        <s-button
          slot="secondary-actions"
          commandFor="create-discount-modal"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>

      {rows.length > 0 ? (
        <s-section padding="none">
          <s-table>
            <s-table-header-row>
              <s-table-header listSlot="primary">Name</s-table-header>
              <s-table-header listSlot="labeled">Type</s-table-header>
              <s-table-header listSlot="inline">Status</s-table-header>
              <s-table-header>Actions</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {rows.map((discount) => {
                const isActive = discount.status === "ACTIVE";
                const isPending = pendingId === discount.id;

                return (
                  <s-table-row key={discount.id}>
                    <s-table-cell>
                      <s-text type="strong">{discount.title}</s-text>
                    </s-table-cell>
                    <s-table-cell>{TYPE_LABEL_MAP[discount.type]}</s-table-cell>
                    <s-table-cell>
                      <s-badge tone={isActive ? "success" : "info"}>
                        {isActive ? "Active" : "Inactive"}
                      </s-badge>
                    </s-table-cell>
                    <s-table-cell>
                      <s-stack direction="inline" gap="base">
                        <s-button
                          size="slim"
                          disabled={isPending}
                          loading={isPending}
                          onClick={() => toggleDiscount(discount)}
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </s-button>
                        <s-button
                          size="slim"
                          onClick={() => navigate(EDIT_ROUTE_MAP[discount.type](discount.id))}
                        >
                          Edit
                        </s-button>
                      </s-stack>
                    </s-table-cell>
                  </s-table-row>
                );
              })}
            </s-table-body>
          </s-table>
        </s-section>
      ) : (
        <s-section heading="No discounts yet">
          <s-stack gap="base">
            <s-paragraph>Create your first automatic discount to boost sales and reward customers.</s-paragraph>
            <s-button variant="primary" commandFor="create-discount-modal" command="--show">
              Create discount
            </s-button>
          </s-stack>
        </s-section>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
