import { useState, useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";

import { createDiscountLoader } from "./loaders/createDiscountLoader";
import { useDiscount } from "./hooks/useDiscount";

import Breadcrumbs from "../components/Breadcrumbs";
import ConfirmModal from "../components/ConfirmModal";

export const loader = createDiscountLoader("freeGiftVariant");

export default function FreeGiftVariantPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData() || {};

  const isEdit = mode === "edit";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [title, setTitle] = useState(status?.title || "");
  const [isActive, setIsActive] = useState(status?.status === "ACTIVE");
  const [settings, setSettings] = useState({});

  const {
    loading,
    banner,
    setBanner,
    create,
    save,
    toggleStatus,
    remove,
  } = useDiscount({
    type: "freeGiftVariant",
    navigate,
    discountId,
  });

  const bannerError = (message) =>
    setBanner({ message, tone: "critical" });

  const updateSetting = (key, value) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  function validate() {
    if (!title?.trim()) {
      bannerError("Discount name is required");
      return false;
    }

    if (!settings?.triggerSku?.trim()) {
      bannerError("Trigger SKU is required");
      return false;
    }

    if (!settings?.giftSku?.trim()) {
      bannerError("Gift SKU is required");
      return false;
    }

    return true;
  }

  useEffect(() => {
    if (!status?.metafield?.value) return;

    try {
      const parsed = JSON.parse(status.metafield.value);
      setSettings({
        triggerSku: parsed.triggerSku ?? "",
        giftSku: parsed.giftSku ?? "",
      });
    } catch (e) {
      console.error("Metafield parse error", e);
    }
  }, [status]);

  function handleCreate() {
    if (!validate()) return;
    create({ title, settings });
  }

  function handleSave() {
    if (!validate()) return;
    save({
      settings,
      requestedStatus: isActive ? "ACTIVE" : "INACTIVE",
    });
  }

  function handleToggle(newStatus) {
    toggleStatus({
      settings,
      newStatus,
    });
    setIsActive(newStatus === "ACTIVE");
  }

  return (
    <s-page backAction={{ content: "Discounts", url: "/app" }}>
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
          <div style={{ marginBottom: "10px", display: "flex", gap: "10px" }}>
            <s-heading variant="headingMd">
              Free gift triggered by variant
            </s-heading>

            {isEdit && status && (
              <s-badge tone={isActive ? "success" : "info"}>
                {isActive ? "Active" : "Inactive"}
              </s-badge>
            )}
          </div>

          <div style={{ maxWidth: "60%" }}>
            <s-text-field
              label="Discount name:"
              value={title}
              disabled={loading}
              onInput={(e) => setTitle(e.target.value)}
            />

            <s-text-field
              label="Trigger variant SKU:"
              value={(settings.triggerSku || "").toString()}
              disabled={loading}
              onInput={(e) => updateSetting("triggerSku", e.target.value)}
            />

            <s-text-field
              label="Gift variant SKU:"
              value={(settings.giftSku || "").toString()}
              disabled={loading}
              onInput={(e) => updateSetting("giftSku", e.target.value)}
            />
          </div>

          {isEdit && (
            <s-inline-stack gap="200" wrap>
              <div style={{ display: "flex", gap: "10px", margin: "10px 0" }}>
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

          <div style={{ marginTop: "10px" }}>
            <s-button
              onClick={isEdit ? handleSave : handleCreate}
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : isEdit
                ? "Save changes"
                : "Create discount"}
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
    </s-page>
  );
}