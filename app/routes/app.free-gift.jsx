/* eslint-disable no-undef */
import { useState, useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";

import { metadata } from "../extensions/free-gift";
import { createDiscountLoader } from "./loaders/createDiscountLoader";
import { useDiscount } from "./hooks/useDiscount";

import Breadcrumbs from "../components/Breadcrumbs";
import ConfirmModal from "../components/ConfirmModal";
import VariantSkuPicker from "../components/VariantSkuPicker"

export const loader = createDiscountLoader("freeGift");

export default function DashboardPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData();

  const isEdit = mode === "edit";
  const hasDiscount = isEdit && Boolean(status);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [title, setTitle] = useState(status?.title || "");
  const [isActive, setIsActive] = useState(status?.status === "ACTIVE");

  const [settings, setSettings] = useState(() => {
    const initial = {};
    metadata.settings.forEach((s) => (initial[s.key] = s.default));
    return initial;
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
    type: "freeGift",
    navigate,
    discountId,
  });

  const bannerError = (message) =>
    setBanner({ message, tone: "critical" });

  function validateForm() {
    if (!title?.trim()) {
      bannerError("Discount title is required");
      return false;
    }

    if (!settings?.FREE_GIFT_SKU?.sku) {
      bannerError("Free gift SKU is required");
      return false;
    }

    return true;
  }

  const handleSettingChange = (key, value) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!status?.metafield?.value) return;

    try {
      const parsed = JSON.parse(status.metafield.value);

      setSettings({
        CART_TOTAL_THRESHOLD: parsed.threshold
          ? parsed.threshold / 100
          : metadata.settings.find((s) => s.key === "CART_TOTAL_THRESHOLD")
              ?.default,
        FREE_GIFT_SKU: parsed.sku || "",
      });
    } catch (e) {
      console.error("Metafield parse error", e);
    }
  }, [status]);

  function getFormattedSettings() {
    return {
      CART_TOTAL_THRESHOLD: Math.round(settings.CART_TOTAL_THRESHOLD * 100),
      FREE_GIFT_SKU: settings.FREE_GIFT_SKU,
    };
  }

  function handleCreate() {
    if (!validateForm()) return;
    create({ title, settings: getFormattedSettings() });
  }

  function handleSave() {
    if (!validateForm()) return;
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
          <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
            <s-heading variant="headingMd">{metadata.name}</s-heading>
            {hasDiscount && (
              <s-badge tone={isActive ? "success" : "info"}>
                {isActive ? "Active" : "Inactive"}
              </s-badge>
            )}
          </div>

          <s-text tone="subdued">{metadata.description}</s-text>

          <div style={{ width: "40%", marginTop: "10px" }}>
            <s-text-field
              label="Discount name"
              value={title}
              disabled={loading}
              onInput={(e) => setTitle(e.target.value)}
            />
          </div>

          <s-stack gap="200">
            <div
              style={{
                display: "flex",
                gap: 20,
                alignItems: "flex-end",
                flexWrap: "wrap",
                margin: "10px 0",
              }}
            >
              {metadata.settings.map((setting) => (
                <div key={setting.key} style={{ minWidth: 220 }}>

                {setting.key === "CART_TOTAL_THRESHOLD" ? (
                  <s-money-field
                    label={setting.label}
                    currency="EUR"
                    value={settings.CART_TOTAL_THRESHOLD || 0}
                    disabled={loading}
                    onInput={(e) =>
                      handleSettingChange(
                        "CART_TOTAL_THRESHOLD",
                        parseFloat(e.target.value || 0)
                      )
                    }
                  />
                ) : setting.key === "FREE_GIFT_SKU" ? (
                  <VariantSkuPicker
                    label={setting.label}
                    value={settings.FREE_GIFT_SKU}
                    disabled={loading}
                    onChange={(sku) =>
                      handleSettingChange("FREE_GIFT_SKU", sku)
                    }
                    onError={(msg) =>
                      setBanner({ message: msg, tone: "critical" })
                    }
                  />
                
                ) : (
                  <s-text-field
                    label={setting.label}
                    type={setting.type}
                    value={(settings[setting.key] ?? "").toString()}
                    disabled={loading}
                    onInput={(e) =>
                      handleSettingChange(
                        setting.key,
                        setting.type === "number"
                          ? parseFloat(e.target.value || 0)
                          : e.target.value
                      )
                    }
                  />
                )}

                </div>
              ))}
            </div>
          </s-stack>

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
        </s-stack>

        <s-button
          onClick={isEdit ? handleSave : handleCreate}
          disabled={loading}
        >
          {loading
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
            ? "Save changes"
            : "Create free gift discount"}
        </s-button>
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