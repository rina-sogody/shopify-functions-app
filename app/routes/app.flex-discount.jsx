/* eslint-disable no-undef */
import { useMemo, useState } from "react";
import { useLoaderData, useNavigate } from "react-router";

import VariantSkuPicker from "../components/VariantSkuPicker";
import { createDiscountLoader } from "./loaders/createDiscountLoader";
import { useDiscount } from "./hooks/useDiscount";
import SButton from "../components/SButton";

export const loader = createDiscountLoader("flex");

function normalizeEligibleSkus(value = []) {
  return (value || [])
    .map((entry) => {
      if (typeof entry === "string") {
        return entry.trim()
          ? {
              sku: entry.trim(),
              variantId: null,
              productId: null,
              title: "",
              productTitle: "",
              image: null,
            }
          : null;
      }

      if (!entry || typeof entry !== "object") return null;

      const sku = entry.sku?.trim() || null;
      const variantId = entry.variantId || entry.id || null;

      if (!sku && !variantId) return null;

      return {
        sku,
        variantId,
        productId: entry.productId || null,
        title: entry.title || "",
        productTitle: entry.productTitle || "",
        image: entry.image || null,
      };
    })
    .filter(Boolean);
}

function serializeEligibleSkus(value = []) {
  return (value || [])
    .map((entry) => {
      if (typeof entry === "string") {
        const sku = entry.trim();
        return sku ? { sku, variantId: null } : null;
      }

      if (!entry || typeof entry !== "object") return null;

      const sku =
        typeof entry.sku === "string" && entry.sku.trim()
          ? entry.sku.trim()
          : null;

      const variantId = entry.variantId || entry.id || null;

      if (!sku && !variantId) return null;

      return { sku, variantId };
    })
    .filter(Boolean);
}

function normalizeTiers(value = []) {
  return (value || [])
    .map((t) => ({
      threshold: Number(t.threshold || 0),
      percent: Number(t.percent || 0),
      message: t.message || "",
    }))
    .filter((t) => t.threshold > 0 && t.percent > 0);
}

function safelyParseJson(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default function FlexDiscountPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData();
  const isEdit = mode === "edit";

  const [isActive, setIsActive] = useState(status?.status === "ACTIVE");
  const [title, setTitle] = useState(status?.title || "");

  const [settings, setSettings] = useState(() => {
    const data =
      status?.hydratedSettings ||
      safelyParseJson(status?.metafield?.value);

    return data
      ? {
          tiers: normalizeTiers(data.tiers),
          eligibleSkus: normalizeEligibleSkus(data.eligibleSkus),
        }
      : { tiers: [], eligibleSkus: [] };
  });

  const { loading, setBanner, create, save, toggleStatus, remove } =
    useDiscount({
      type: "flex",
      navigate,
      discountId,
    });

  const sortedTiers = useMemo(
    () => [...settings.tiers].sort((a, b) => a.threshold - b.threshold),
    [settings.tiers]
  );

  const selectedProductCount = useMemo(
    () =>
      new Set(
        (settings.eligibleSkus || [])
          .map((entry) => entry?.productId)
          .filter(Boolean)
      ).size,
    [settings.eligibleSkus]
  );

  const selectedVariantCount = settings.eligibleSkus?.length || 0;

  const bannerError = (msg) =>
    setBanner({ message: msg, tone: "critical" });

  function validate() {
    if (!title?.trim())
      return bannerError("Discount name is required"), false;

    if (!settings.tiers.length)
      return bannerError("Add at least one tier"), false;

    const seen = new Set();

    for (const t of settings.tiers) {
      if (!Number.isFinite(t.threshold) || t.threshold <= 0) {
        return bannerError("Threshold must be greater than 0"), false;
      }

      if (!Number.isFinite(t.percent) || t.percent <= 0 || t.percent > 100) {
        return bannerError("Discount must be 1-100%"), false;
      }

      if (seen.has(t.threshold))
        return bannerError("Thresholds must be unique"), false;

      seen.add(t.threshold);
    }

    return true;
  }

  const getSortedSettings = () => ({
    tiers: sortedTiers.map((tier) => ({
      threshold: Number(tier.threshold),
      percent: Number(tier.percent),
      message:
        typeof tier.message === "string" && tier.message.trim()
          ? tier.message.trim()
          : `${Number(tier.percent)}% off`,
    })),
    eligibleSkus: serializeEligibleSkus(settings.eligibleSkus),
  });

  const handleCreate = () =>
    validate() && create({ title, settings: getSortedSettings() });

  const handleSave = () =>
    validate() &&
    save({
      title,
      settings: getSortedSettings(),
      requestedStatus: isActive ? "ACTIVE" : "INACTIVE",
    });

  const handleToggle = (s) => {
    toggleStatus({ settings: getSortedSettings(), newStatus: s });
    setIsActive(s === "ACTIVE");
  };

  const addTier = () => {
    const last = sortedTiers[sortedTiers.length - 1];

    setSettings((p) => ({
      ...p,
      tiers: [
        ...p.tiers,
        {
          threshold: last ? last.threshold + 5000 : 5000,
          percent: last ? Math.min(last.percent + 5, 50) : 10,
        },
      ],
    }));
  };

  const removeTier = (i) =>
    setSettings((p) => ({
      ...p,
      tiers: p.tiers.filter((_, idx) => idx !== i),
    }));

  const updateTier = (i, patch) =>
    setSettings((p) => ({
      ...p,
      tiers: p.tiers.map((t, idx) =>
        idx === i ? { ...t, ...patch } : t
      ),
    }));

  return (
    <s-page heading={isEdit ? "Edit tiered discount" : "Create tiered discount"}>
      <s-link slot="breadcrumb-actions" href="/app">
        Discounts
      </s-link>

      {isEdit && (
        <>
          <SButton
            slot="secondary-actions"
            onClick={() =>
              handleToggle(isActive ? "INACTIVE" : "ACTIVE")
            }
            disabled={loading}
          >
            {isActive ? "Deactivate" : "Activate"}
          </SButton>

          <SButton
            slot="secondary-actions"
            tone="critical"
            commandFor="delete-flex-modal"
            command="--show"
            disabled={loading}
          >
            Delete
          </SButton>
          </>
        )}

      <s-modal id="delete-flex-modal" heading="Delete this discount?">
        <s-paragraph>
          This action cannot be undone. The discount will be permanently removed.
        </s-paragraph>

        <SButton
          slot="primary-action"
          variant="primary"
          tone="critical"
          loading={loading}
          onClick={remove}
          commandFor="delete-flex-modal"
          command="--hide"
        >
          Delete
        </SButton>

        <s-button
          slot="secondary-actions"
          commandFor="delete-flex-modal"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>

      <SButton
        slot="primary-action"
        variant="primary"
        onClick={isEdit ? handleSave : handleCreate}
        disabled={loading}
        loading={loading}
      >
        {isEdit ? "Save" : "Create"}
      </SButton>

      {/* 1. NAME */}
      <s-section heading="Name">
        <s-text-field
          label="Discount name"
          value={title}
          disabled={loading}
          onInput={(e) => setTitle(e.target.value)}
          helpText="Internal only"
        />
      </s-section>

      {/* 2. PRODUCTS */}
      <s-section heading="Products">
        <VariantSkuPicker
          label={
            selectedVariantCount
              ? `${selectedProductCount || selectedVariantCount} product(s), ${selectedVariantCount} variant(s) selected`
              : "All products"
          }
          value={settings.eligibleSkus}
          multiple
          allowVariantsWithoutSku
          disabled={loading}
          onChange={(skus) =>
            setSettings((p) => ({ ...p, eligibleSkus: skus }))
          }
          onError={(msg) => bannerError(msg)}
        />
      </s-section>

      {/* 3. TIERS */}
      <s-section heading="Tiers">
        {settings.tiers.length === 0 ? (
          <s-stack gap="base">
            <s-paragraph>
              No tiers yet. Add spending thresholds with discounts.
            </s-paragraph>

            <SButton
              variant="primary"
              onClick={addTier}
              disabled={loading}
            >
              Add tier
            </SButton>
          </s-stack>
        ) : (
          <s-stack gap="base">
            <s-table>
              <s-table-header-row>
                <s-table-header>Min. Spend (€)</s-table-header>
                <s-table-header>Discount (%)</s-table-header>
                <s-table-header></s-table-header>
              </s-table-header-row>

              <s-table-body>
                {settings.tiers.map((tier, i) => (
                  <s-table-row key={i}>
                    <s-table-cell>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={(tier.threshold / 100) || ""}
                        disabled={loading}
                        onChange={(e) => {
                          const parsed = parseFloat(
                            e.target.value || "0"
                          );

                          updateTier(i, {
                            threshold: Number.isFinite(parsed)
                              ? Math.round(parsed * 100)
                              : 0,
                          });
                        }}
                        style={{
                          width: "100px",
                          padding: "8px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                        }}
                      />
                    </s-table-cell>

                    <s-table-cell>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={tier.percent || ""}
                        disabled={loading}
                        onChange={(e) => {
                          const parsed = parseInt(
                            e.target.value || "0",
                            10
                          );

                          updateTier(i, {
                            percent: Number.isFinite(parsed)
                              ? parsed
                              : 0,
                          });
                        }}
                        style={{
                          width: "80px",
                          padding: "8px",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                        }}
                      />
                    </s-table-cell>

                    <s-table-cell>
                      <SButton
                        size="slim"
                        tone="critical"
                        onClick={() => removeTier(i)}
                        disabled={loading}
                      >
                        ×
                      </SButton>
                    </s-table-cell>
                  </s-table-row>
                ))}
              </s-table-body>
            </s-table>

            <SButton onClick={addTier} disabled={loading}>
              Add tier
            </SButton>
          </s-stack>
        )}
      </s-section>

      {sortedTiers.length > 0 && (
        <s-section heading="Summary">
          <s-paragraph>
            {sortedTiers
              .map(
                (t) =>
                  `€${(t.threshold / 100).toFixed(0)}+ = ${t.percent}% off`
              )
              .join(" • ")}
          </s-paragraph>
        </s-section>
      )}
    </s-page>
  );
}