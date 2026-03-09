/* eslint-disable no-undef */
import { useState, useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";

import { createDiscountLoader } from "./loaders/createDiscountLoader";
import { useDiscount } from "./hooks/useDiscount";

export const loader = createDiscountLoader("reject");

export default function RejectDiscountPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData();

  const isEdit = mode === "edit";
  const hasDiscount = isEdit && Boolean(status);

  const [message, setMessage] = useState("");
  const [title, setTitle] = useState(status?.title || "");
  const [isActive, setIsActive] = useState(status?.status === "ACTIVE");

  const {
    loading,
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

  const bannerError = (msg) =>
    setBanner({ message: msg, tone: "critical" });

  function validate() {
    if (!title?.trim()) {
      bannerError("Campaign name required");
      return false;
    }
    return true;
  }

  function handleCreate() {
    if (!validate()) return;
    create({ title, settings: { message } });
  }

  function handleSave() {
    if (!validate()) return;
    save({
      title,
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
    <s-page heading={isEdit ? "Edit Reject Discounts" : "Create Reject Discounts"}>
      <s-link slot="breadcrumb-actions" href="/app">Discounts</s-link>

      {isEdit && (
        <>
          <s-button slot="secondary-actions" onClick={() => handleToggle(isActive ? "INACTIVE" : "ACTIVE")} disabled={loading}>
            {isActive ? "Deactivate" : "Activate"}
          </s-button>
          <s-button slot="secondary-actions" tone="critical" commandFor="delete-reject-modal" command="--show" disabled={loading}>
            Delete
          </s-button>
        </>
      )}
      <s-button slot="primary-action" variant="primary" onClick={isEdit ? handleSave : handleCreate} disabled={loading} loading={loading}>
        {isEdit ? "Save" : "Create"}
      </s-button>

      {/* Delete Modal */}
      <s-modal id="delete-reject-modal" heading="Delete this discount blocker?">
        <s-paragraph>This action cannot be undone. The discount blocker will be permanently removed.</s-paragraph>
        <s-button
          slot="primary-action"
          variant="primary"
          tone="critical"
          loading={loading}
          onClick={handleDelete}
          commandFor="delete-reject-modal"
          command="--hide"
        >
          Delete
        </s-button>
        <s-button
          slot="secondary-actions"
          commandFor="delete-reject-modal"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>

      {/* Info Section */}
      <s-section heading="How it works">
        <s-stack gap="base">
          {hasDiscount && (
            <s-badge tone={isActive ? "success" : "info"}>
              {isActive ? "Active" : "Inactive"}
            </s-badge>
          )}
          <s-paragraph>
            When this blocker is active, all discount codes entered at checkout will be rejected. 
            Use this during special promotions or flash sales where you do not want additional 
            discounts applied on top of existing deals.
          </s-paragraph>
        </s-stack>
      </s-section>

      {/* Blocker Details */}
      <s-section heading="Blocker details">
        <s-text-field
          label="Campaign name"
          value={title}
          disabled={loading}
          onInput={(e) => setTitle(e.target.value)}
          helpText="Internal name for this discount blocker campaign."
        />
      </s-section>

      {/* Customer Message */}
      <s-section heading="Customer message">
        <s-stack gap="base">
          <s-paragraph>
            This message will be displayed when customers try to apply a discount code.
          </s-paragraph>
          <s-text-field
            label="Rejection message"
            value={message}
            disabled={loading}
            onInput={(e) => setMessage(e.target.value)}
            placeholder="e.g., Discount codes cannot be used during this sale"
          />
        </s-stack>
      </s-section>
    </s-page>
  );
}
