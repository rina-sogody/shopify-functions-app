/* eslint-disable no-undef */
import { useEffect, useState, useCallback } from "react";
import { useLoaderData, useNavigate } from "react-router";

import VariantSkuPicker from "../components/VariantSkuPicker";
import { createDiscountLoader } from "./loaders/createDiscountLoader";
import { useDiscount } from "./hooks/useDiscount";
import SButton from "../components/SButton";

export const loader = createDiscountLoader("freeGiftVariant");

function normalizeSku(value) {
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
}

function variantSummary(value) {
  if (!value) return "Not selected";

  const name = value.productTitle || value.title || "Selected variant";
  return value.sku ? `${name} (${value.sku})` : name;
}

export default function FreeGiftVariantPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData() || {};

  const isEdit = mode === "edit";
  const hasDiscount = isEdit && Boolean(status);

  const [title, setTitle] = useState(status?.title || "");
  const [isActive, setIsActive] = useState(status?.status === "ACTIVE");

  const [settings, setSettings] = useState({
    triggerSku: null,
    giftSku: null,
  });

  const { loading, setBanner, create, save, toggleStatus, remove } =
    useDiscount({
      type: "freeGiftVariant",
      navigate,
      discountId,
    });

  const bannerError = useCallback(
    (message) => setBanner({ message, tone: "critical" }),
    [setBanner]
  );

  const updateSetting = useCallback((key, value) => {
    setSettings((previous) => ({ ...previous, [key]: value }));
  }, []);

  const validate = useCallback(() => {
    if (!title?.trim()) {
      bannerError("Discount name is required");
      return false;
    }

    if (!settings?.triggerSku?.sku) {
      bannerError("Trigger variant with SKU is required");
      return false;
    }

    if (!settings?.giftSku?.sku) {
      bannerError("Gift variant with SKU is required");
      return false;
    }

    return true;
  }, [title, settings, bannerError]);

  useEffect(() => {
    if (!status?.metafield?.value) return;

    try {
      const parsed = JSON.parse(status.metafield.value);

      setSettings({
        triggerSku: normalizeSku(parsed.triggerSku),
        giftSku: normalizeSku(parsed.giftSku),
      });

      setTitle(status?.title || "");
      setIsActive(status?.status === "ACTIVE");
    } catch (error) {
      console.error("Metafield parse error", error);
    }
  }, [status]);

  const getFormattedSettings = useCallback(() => {
    return {
      triggerSku: settings.triggerSku || null,
      giftSku: settings.giftSku || null,
    };
  }, [settings]);

  const handleCreate = useCallback(() => {
    if (!validate()) return;

    create({
      title,
      settings: getFormattedSettings(),
    });
  }, [validate, create, title, getFormattedSettings]);

  const handleSave = useCallback(() => {
    if (!validate()) return;

    save({
      title,
      settings: getFormattedSettings(),
      requestedStatus: isActive ? "ACTIVE" : "INACTIVE",
    });
  }, [validate, save, title, isActive, getFormattedSettings]);

  const handleToggle = useCallback(
    (newStatus) => {
      toggleStatus({
        settings: getFormattedSettings(),
        newStatus,
      });

      setIsActive(newStatus === "ACTIVE");
    },
    [toggleStatus, getFormattedSettings]
  );

  const handleDelete = useCallback(() => {
    remove();
  }, [remove]);

  return (
    <s-page
      heading={
        isEdit
          ? "Edit variant trigger discount"
          : "Create variant trigger discount"
      }
    >
      <s-link slot="breadcrumb-actions" href="/app">
        Discounts
      </s-link>

      {isEdit && (
        <>
          <SButton
            slot="secondary-actions"
            variant="secondary"
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
            variant="secondary"
            onClick={handleDelete}
            disabled={loading}
          >
            Delete
          </SButton>
        </>
      )}

      <SButton
        slot="primary-action"
        variant="primary"
        onClick={isEdit ? handleSave : handleCreate}
        disabled={loading}
        loading={loading}
      >
        {isEdit ? "Save" : "Create"}
      </SButton>

      <s-section heading="Overview">
        <s-stack gap="small-300">
          {hasDiscount && (
            <s-badge tone={isActive ? "success" : "info"}>
              {isActive ? "Active" : "Inactive"}
            </s-badge>
          )}

          <s-text-field
            label="Discount name"
            value={title}
            disabled={loading}
            onInput={(event) => setTitle(event.target.value)}
            details="Internal name for Shopify Admin"
          />

          <s-paragraph color="subdued">
            When the trigger variant is in cart, the gift variant is
            discounted by 100%.
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Variant mapping">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
            gap: "16px",
          }}
        >
          <s-box
            padding="small-300"
            border="base"
            borderColor="base"
            borderRadius="base"
          >
            <s-stack gap="small-200">
              <s-text type="strong">Trigger variant</s-text>
              <s-text color="subdued">
                Customer must have this in cart
              </s-text>

              <VariantSkuPicker
                compact
                label="Trigger variant"
                value={settings.triggerSku}
                disabled={loading}
                onChange={(sku) => updateSetting("triggerSku", sku)}
                onError={(message) =>
                  setBanner({ message, tone: "critical" })
                }
              />
            </s-stack>
          </s-box>

          <s-box
            padding="small-300"
            border="base"
            borderColor="base"
            borderRadius="base"
          >
            <s-stack gap="small-200">
              <s-text type="strong">Gift variant</s-text>
              <s-text color="subdued">
                This item becomes free
              </s-text>

              <VariantSkuPicker
                compact
                label="Gift variant"
                value={settings.giftSku}
                disabled={loading}
                onChange={(sku) => updateSetting("giftSku", sku)}
                onError={(message) =>
                  setBanner({ message, tone: "critical" })
                }
              />
            </s-stack>
          </s-box>
        </div>
      </s-section>

      <s-section heading="Preview">
        <s-stack gap="small-100">
          <s-text type="strong">
            {variantSummary(settings.triggerSku)}
          </s-text>

          <s-text color="subdued">triggers</s-text>

          <s-text type="strong">
            {variantSummary(settings.giftSku)}
          </s-text>
        </s-stack>
      </s-section>
    </s-page>
  );
}