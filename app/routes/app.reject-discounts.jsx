import { useState, useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";

import { createDiscountLoader } from "./loaders/createDiscountLoader";
import { useDiscount } from "./hooks/useDiscount";

import Breadcrumbs from "../components/Breadcrumbs";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";

export const loader = createDiscountLoader("reject");

export default function RejectDiscountPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData();
  const [message, setMessage] = useState("");

  const isEdit = mode === "edit";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [title, setTitle] = useState(status?.title || "");
  const [isActive, setIsActive] = useState(status?.status === "ACTIVE");

  const {
    loading,
    toast,
    setToast,
    create,
    save,
    toggleStatus,
    remove,
  } = useDiscount({
    type: "reject",
    navigate,
    discountId,
  });

  const toastError = (message) => setToast({ message, tone: "error" });

  function validate() {
    if (!title?.trim()) {
      toastError("Campaign name required");
      return false;
    }
    return true;
  }

  function handleCreate() {
    if (!validate()) return;
    create({ title, 
      settings: { message }
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
      <Breadcrumbs />

      <s-section>
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
                  onClick={() => setConfirmOpen(true)}
                  disabled={loading}
                >
                  Delete discount
                </s-button>
              </div>
            </s-inline-stack>
          )}

          <div>
            <s-button onClick={isEdit ? handleSave : handleCreate} disabled={loading}>
              {loading ? "Processing..." : isEdit ? "Save changes" : "Create"}
            </s-button>
          </div>
        </s-stack>
      </s-section>

      {confirmOpen && (
        <ConfirmModal
          open={confirmOpen}
          title="Are you sure you want to delete this discount?"
          confirmLabel="Yes"
          cancelLabel="No"
          loading={loading}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={remove}
        />
      )}

      <Toast message={toast?.message} tone={toast?.tone} onClose={() => setToast(null)} />
    </s-page>
  );
}