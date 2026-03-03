import { useState, useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";

import { createDiscountLoader } from "./loaders/createDiscountLoader";
import { useDiscount } from "./hooks/useDiscount";

import Breadcrumbs from "../components/Breadcrumbs";
import ConfirmModal from "../components/ConfirmModal";
import VariantSkuPicker from "../components/VariantSkuPicker";

export const loader = createDiscountLoader("freeGiftVariant");

export default function FreeGiftVariantPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData() || {};

  const isEdit = mode === "edit";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [title, setTitle] = useState(status?.title || "");
  const [isActive, setIsActive] = useState(status?.status === "ACTIVE");
  const [settings, setSettings] = useState({
    triggerSku: null,
    giftSku: null,
  });

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
  
    if (!settings?.triggerSku?.sku) {
      bannerError("Trigger variant is required");
      return false;
    }
  
    if (!settings?.giftSku?.sku) {
      bannerError("Gift variant is required");
      return false;
    }
  
    return true;
  }

  useEffect(() => {
    if (!status?.metafield?.value) return;

    try {
      const parsed = JSON.parse(status.metafield.value);

      const normalizeSku = (value) => {
        if (!value) return null;

        if (typeof value === "string") {
          return {
            sku: value,
            variantId: null,
            productId: null,
            title: "",
            productTitle: "",
            image: null,
          };
        }
        
        if (typeof value === "object") {
          return {
            sku: value.sku ?? null,
            variantId: value.variantId ?? null,
            productId: value.productId ?? null,
            title: value.title ?? "",
            productTitle: value.productTitle ?? "",
            image: value.image ?? null,
          };
        }

        return null;
      };

      setSettings({
        triggerSku: normalizeSku(parsed.triggerSku),
        giftSku: normalizeSku(parsed.giftSku),
      });

      setTitle(status?.title || "");
      setIsActive(status?.status === "ACTIVE");

    } catch (e) {
      console.error("Metafield parse error", e);
    }
  }, [status]);

  function getFormattedSettings() {
    return {
      triggerSku: settings.triggerSku || null,
      giftSku: settings.giftSku || null,
    };
  }

  function handleCreate() {
    if (!validate()) return;
    create({ title, settings: getFormattedSettings() });
  }

  function handleSave() {
    if (!validate()) return;
    save({
      settings: getFormattedSettings(),
      requestedStatus: isActive ? "ACTIVE" : "INACTIVE",
    });
  }

  function handleToggle(newStatus) {
    toggleStatus({
      settings: getFormattedSettings(),
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
            <div style={{ marginTop: "10px" }}>
              <s-stack gap="200">
                <div style={{ display: "flex", flexDirection: "column", gap: "10px"}}>

                <VariantSkuPicker
                  label="Trigger variant: "
                  value={settings.triggerSku}
                  disabled={loading}
                  onChange={(sku) => updateSetting("triggerSku", sku)}
                  onError={(msg) =>
                    setBanner({ message: msg, tone: "critical" })
                  }
                />

                <VariantSkuPicker
                  label="Gift variant: "
                  value={settings.giftSku}
                  disabled={loading}
                  onChange={(sku) => updateSetting("giftSku", sku)}
                  onError={(msg) =>
                    setBanner({ message: msg, tone: "critical" })
                  }
                />
                </div>

              </s-stack>
            </div>
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