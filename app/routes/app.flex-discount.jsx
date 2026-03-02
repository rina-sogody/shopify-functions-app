import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router";

import { metadata } from "../extensions/flex-discount";
import { createDiscountLoader } from "./loaders/createDiscountLoader";
import { useDiscount } from "./hooks/useDiscount";

import Breadcrumbs from "../components/Breadcrumbs";
import ConfirmModal from "../components/ConfirmModal";
import VariantSkuPicker from "../components/VariantSkuPicker"

export const loader = createDiscountLoader("flex");

export default function FlexDiscountPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData();

  const isEdit = mode === "edit";
  const hasDiscount = isEdit && Boolean(status);

  const [isActive, setIsActive] = useState(status?.status === "ACTIVE");
  const [title, setTitle] = useState(status?.title || "");

const [settings, setSettings] = useState(() => {
  if (status?.hydratedSettings) {
    return {
      tiers: status.hydratedSettings.tiers || [],
      eligibleSkus: status.hydratedSettings.eligibleSkus || [],
    };
  }

  if (status?.metafield?.value) {
    try {
      const parsed = JSON.parse(status.metafield.value);
      return {
        tiers: parsed.tiers || [],
        eligibleSkus: parsed.eligibleSkus || [],
      };
    } catch {
      return { tiers: [], eligibleSkus: [] };
    }
  }

  return { tiers: [], eligibleSkus: [] };
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
    type: "flex",
    navigate,
    discountId,
  });

  const bannerError = (message) =>
    setBanner({ message, tone: "critical" });

  function validate() {
    if (!title?.trim()) {
      bannerError("Discount name is required");
      return false;
    }

    if (!settings?.tiers?.length) {
      bannerError("At least one discount tier is required");
      return false;
    }

    for (const tier of settings.tiers) {
      if (tier.threshold === undefined || tier.threshold === null) {
        bannerError("Threshold is required");
        return false;
      }

      if (isNaN(tier.threshold) || tier.threshold <= 0) {
        bannerError("Threshold must be greater than 0");
        return false;
      }

      if (isNaN(tier.percent) || tier.percent <= 0 || tier.percent > 100) {
        bannerError("Discount percent must be between 1 and 100");
        return false;
      }
    }

    return true;
  }

  function getSortedSettings() {
    const sorted = [...settings.tiers].sort(
      (a, b) => a.threshold - b.threshold
    );

    return {
      tiers: sorted,
      eligibleSkus: settings.eligibleSkus || [],
    };
  }

  function handleCreate() {
    if (!validate()) return;
    create({ title, settings: getSortedSettings() });
  }

  function handleSave() {
    if (!validate()) return;
    save({
      settings: getSortedSettings(),
      requestedStatus: isActive ? "ACTIVE" : "INACTIVE",
    });
  }

  function handleToggle(newStatus) {
    toggleStatus({
      settings: getSortedSettings(),
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

        <div style={{ marginBottom: "10px" }}>
          <s-stack gap="100">
            <div style={{ display: "flex", flexDirection: "row", gap: "10px", marginBottom: "10px" }}>
              <s-heading variant="headingMd">{metadata.name}</s-heading>
              {hasDiscount && (
                <s-badge tone={isActive ? "success" : "info"}>
                  {isActive ? "Active" : "Inactive"}
                </s-badge>
              )}
            </div>
            <s-paragraph tone="subdued">{metadata.description}</s-paragraph>
          </s-stack>
        </div>

        <div style={{ width: "60%" }}>
          <s-text-field
            label="Discount name"
            value={title}
            disabled={loading}
            onInput={(e) => setTitle(e.target.value)}
          />
        </div>

        <div style={{ width: "60%", marginTop: "10px" }}>
          <s-section heading="Discount tiers">
            <s-stack gap="200">
              {settings.tiers.map((tier, index) => (
                <div key={index} style={{ display: "flex", alignItems: "flex-end", gap: "20px", marginBottom: "10px" }}>
                  <div style={{ width: 120 }}>
                  <s-money-field
                    label="Spend"
                    currency="EUR"
                    value={(tier.threshold / 100) || 0}
                    disabled={loading}
                    onInput={(e) => {
                      const value = parseFloat(e.target.value || 0);
                      const updated = [...settings.tiers];
                      updated[index].threshold = Math.round(value * 100);
                      setSettings({ ...settings, tiers: updated });
                    }}
                  />
                  </div>

                  <div style={{ width: 120 }}>
                    <s-text-field
                      label="Discount %"
                      type="number"
                      value={tier.percent.toString()}
                      disabled={loading}
                      onInput={(e) => {
                        const updated = [...settings.tiers];
                        updated[index].percent = parseInt(e.target.value || 0, 10);
                        setSettings({ ...settings, tiers: updated });
                      }}
                    />
                  </div>

                  <s-button
                    tone="critical"
                    disabled={loading}
                    onClick={() =>
                      setSettings({
                        ...settings,
                        tiers: settings.tiers.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Remove
                  </s-button>
                </div>
              ))}

              <s-button
                variant="secondary"
                disabled={loading}
                onClick={() =>
                  setSettings({
                    ...settings,
                    tiers: [...settings.tiers, { threshold: 0, percent: 10 }],
                  })
                }
              >
                + Add tier
              </s-button>
            </s-stack>
          </s-section>
        </div>

        <div style={{ margin: "20px 0" }}>
          <VariantSkuPicker
            label="Eligible variants: "
            value={settings.eligibleSkus}
            multiple
            disabled={loading}
            onChange={(skus) =>
              setSettings((prev) => ({
                ...prev,
                eligibleSkus: skus,
              }))
            }
            onError={(msg) =>
              setBanner({ message: msg, tone: "critical" })
            }
          />
        </div>

        {isEdit && (
          <s-inline-stack gap="200" wrap>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px", marginBottom: "20px" }}>
              <s-button onClick={() => handleToggle("ACTIVE")} disabled={isActive || loading}>
                Activate
              </s-button>

              <s-button onClick={() => handleToggle("DEACTIVE")} disabled={!isActive || loading}>
                Deactivate
              </s-button>

              <s-button tone="critical" onClick={() => setConfirmOpen(true)} disabled={loading}>
                Delete discount
              </s-button>
            </div>
          </s-inline-stack>
        )}

        <div style={{ marginTop: "10px" }}>
          <s-button onClick={isEdit ? handleSave : handleCreate} disabled={loading} type="button">
            {loading ? "Processing..." : isEdit ? "Save Changes" : "Create Discount"}
          </s-button>
        </div>
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