/* eslint-disable no-undef */
import { useState, useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";

import { createDiscountLoader } from "./loaders/createDiscountLoader";
import { useDiscount } from "./hooks/useDiscount";

import Breadcrumbs from "../components/Breadcrumbs";

export const loader = createDiscountLoader("reject");

export default function RejectDiscountPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData();

  const isEdit = mode === "edit";

  const [message, setMessage] = useState("");
  const [title, setTitle] = useState(status?.title || "");
  const [isActive, setIsActive] = useState(status?.status === "ACTIVE");

  const {
    loading,
    banner,
    setBanner,
    create,
    save,
    toggleStatus,
    remove,
  } = useDiscount({
    type: "reject",
    navigate,
    discountId,
  });

  const bannerError = (message) =>
    setBanner({ message, tone: "critical" });

  function validate() {
    if (!title?.trim()) {
      bannerError("Campaign name required");
      return false;
    }
    return true;
  }

  function handleCreate() {
    if (!validate()) return;
    create({
      title,
      settings: { message },
    });
  }

  function handleSave() {
    if (!validate()) return;
    save({
      settings: { message },
      requestedStatus: isActive ? "ACTIVE" : "INACTIVE",
    });
  }

  function handleToggle(newStatus) {
    toggleStatus({
      settings: { message },
      newStatus,
    });
    setIsActive(newStatus === "ACTIVE");
  }

  function handleDelete() {
    remove();
  }

  useEffect(() => {
    if (!status?.metafield?.value) return;

    try {
      const parsed = JSON.parse(status.metafield.value);
      setMessage(parsed.message || "");
    } catch (e) {
      console.error("Metafield parse error", e);
    }
  }, [status]);

  return (
    <s-page backAction={{ content: "Discounts", url: "/app" }}>
      <s-modal
        id="delete-reject-discount-modal"
        heading="Are you sure you want to delete this discount?"
      >
        <s-text>This action cannot be undone.</s-text>

        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          loading={loading}
          onClick={handleDelete}
          commandFor="delete-reject-discount-modal"
          command="--hide"
        >
          Yes
        </s-button>

        <s-button
          slot="secondary-actions"
          commandFor="delete-reject-discount-modal"
          command="--hide"
        >
          No
        </s-button>
      </s-modal>

      <Breadcrumbs />

      <s-section>

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

        <s-stack gap="200">
          <div style={{ marginBottom: "10px "}}>
            <div style={{ display: "flex", flexDirection: "row", gap: "10px" }}>
              <s-heading variant="headingMd">Reject Discount</s-heading>
              {isEdit && (
                <s-badge tone={isActive ? "success" : "info"}>
                  {isActive ? "Active" : "Inactive"}
                </s-badge>
              )}
            </div>
          </div>

          <div style={{ marginBottom: "10px"}}>
            <s-text-field
              label="Reject discount name"
              value={title.toString()}
              disabled={loading}
              onInput={(e) => setTitle(e.target.value)}
            />
          </div>

          <s-text-field
            label="Rejection message shown to customers"
            value={message}
            disabled={loading}
            onInput={(e) => setMessage(e.target.value)}
          />

          <div style={{ margin: "10px 0" }}>
            <s-text tone="subdued">
              When active, all codes entered at checkout will be rejected.
            </s-text>
          </div>

          {isEdit && (
            <s-inline-stack gap="200" wrap>
              <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                <s-button
                  onClick={() => handleToggle("ACTIVE")}
                  disabled={isActive || loading}
                >
                  Activate
                </s-button>

                <s-button
                  onClick={() => handleToggle("DEACTIVE")}
                  disabled={!isActive || loading}
                >
                  Deactivate
                </s-button>

                <s-button
                  tone="critical"
                  commandFor="delete-reject-discount-modal"
                  command="--show"
                  disabled={loading}
                >
                  Delete discount
                </s-button>
              </div>
            </s-inline-stack>
          )}

          <div>
            <s-button
              onClick={isEdit ? handleSave : handleCreate}
              disabled={loading}
            >
              {loading ? "Processing..." : isEdit ? "Save changes" : "Create"}
            </s-button>
          </div>
        </s-stack>
      </s-section>
    </s-page>
  );
}