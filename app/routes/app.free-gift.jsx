/* eslint-disable no-undef */
import { useState, useEffect, useRef, useCallback } from "react";
import { useLoaderData, useNavigate } from "react-router";

import { metadata } from "../extensions/free-gift";
import { createDiscountLoader } from "./loaders/createDiscountLoader";
import { useDiscount } from "./hooks/useDiscount";
import VariantSkuPicker from "../components/VariantSkuPicker";
import SButton from "../components/SButton";

export const loader = createDiscountLoader("freeGift");

export default function FreeGiftPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData();

  const isEdit = mode === "edit";
  const hasDiscount = isEdit && Boolean(status);

  const [title, setTitle] = useState(status?.title || "");
  const [isActive, setIsActive] = useState(status?.status === "ACTIVE");
  const [settings, setSettings] = useState({
    CART_TOTAL_THRESHOLD:
      metadata.settings.find((s) => s.key === "CART_TOTAL_THRESHOLD")?.default ?? 0,
    FREE_GIFT_SKU: null,
  });
  const initialState = useRef(null);

  const {
    loading,
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

  const bannerError = useCallback(
    (message) => setBanner({ message, tone: "critical" }),
    [setBanner]
  );

  const updateSetting = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleTitleChange = useCallback((value) => {
    setTitle(value);
  }, []);

  const validate = useCallback(() => {
    if (!title?.trim()) {
      bannerError("Discount name is required");
      return false;
    }
    if (!settings?.FREE_GIFT_SKU?.sku) {
      bannerError("Free gift variant is required");
      return false;
    }
    if (!settings?.CART_TOTAL_THRESHOLD || settings.CART_TOTAL_THRESHOLD <= 0) {
      bannerError("Cart threshold must be greater than 0");
      return false;
    }
    return true;
  }, [title, settings, bannerError]);

  useEffect(() => {
    if (!status?.metafield?.value) return;
    try {
      const parsed = JSON.parse(status.metafield.value);
      let normalizedSku = null;
      if (parsed.sku) {
        if (typeof parsed.sku === "string") {
          normalizedSku = { sku: parsed.sku };
        } else if (typeof parsed.sku === "object") {
          normalizedSku = parsed.sku;
        }
      }
      const newSettings = {
        CART_TOTAL_THRESHOLD:
          parsed.threshold !== undefined && parsed.threshold !== null
            ? parsed.threshold / 100
            : metadata.settings.find((s) => s.key === "CART_TOTAL_THRESHOLD")?.default ?? 0,
        FREE_GIFT_SKU: normalizedSku,
      };
      setSettings(newSettings);
      initialState.current = {
        title: status?.title || "",
        settings: newSettings,
      };
    } catch (e) {
      console.error("Metafield parse error", e);
    }
  }, [status]);

  const getFormattedSettings = useCallback(() => {
    return {
      CART_TOTAL_THRESHOLD: Math.round(settings.CART_TOTAL_THRESHOLD * 100),
      FREE_GIFT_SKU: settings.FREE_GIFT_SKU?.sku,
    };
  }, [settings]);

  const handleCreate = useCallback(() => {
    if (!validate()) return;
    create({
      title,
      settings: getFormattedSettings(),
    });
  }, [title, validate, getFormattedSettings, create]);

  const handleSave = useCallback(() => {
    if (!validate()) return;
    save({
      title,
      settings: getFormattedSettings(),
      requestedStatus: isActive ? "ACTIVE" : "INACTIVE",
    });
  }, [title, isActive, validate, getFormattedSettings, save]);

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
    <s-page heading={isEdit ? "Edit Free Gift Discount" : "Create Free Gift Discount"}>
      <s-link slot="breadcrumb-actions" href="/app">Discounts</s-link>

      {isEdit && (
        <>
          <SButton
            slot="secondary-actions"
            disabled={loading}
            onClick={() => handleToggle(isActive ? "INACTIVE" : "ACTIVE")}
          >
            {isActive ? "Deactivate" : "Activate"}
          </SButton>

          <SButton
            slot="secondary-actions"
            tone="critical"
            commandFor="delete-free-gift-modal"
            command="--show"
            disabled={loading}
          >
            Delete
          </SButton>
        </>
      )}

      <SButton
        slot="primary-action"
        variant="primary"
        disabled={loading}
        loading={loading}
        onClick={isEdit ? handleSave : handleCreate}
      >
        {isEdit ? "Save" : "Create"}
      </SButton>

      <s-modal id="delete-free-gift-modal" heading="Delete this discount?">
        <s-paragraph>This action cannot be undone. The discount will be permanently removed.</s-paragraph>
        <SButton
          slot="primary-action"
          variant="primary"
          tone="critical"
          loading={loading}
          onClick={handleDelete}
          commandFor="delete-free-gift-modal"
          command="--hide"
        >
          Delete
        </SButton>
        <s-button
          slot="secondary-actions"
          commandFor="delete-free-gift-modal"
          command="--hide"
        >
          Cancel
        </s-button>
      </s-modal>

      <s-section heading="How it works">
        <s-stack gap="base">
          {hasDiscount && (
            <s-badge tone={isActive ? "success" : "info"}>
              {isActive ? "Active" : "Inactive"}
            </s-badge>
          )}
          <s-paragraph>
            When a customer cart total exceeds the threshold you set, a free gift
            product will automatically be added to their cart at checkout.
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Discount details">
        <s-text-field
          label="Discount name"
          value={title}
          disabled={loading}
          onInput={(e) => handleTitleChange(e.target.value)}
          helpText="This name is for your reference only. Customers will not see it."
        />
      </s-section>

      <s-section heading="Cart threshold">
        <s-stack gap="base">
          <s-paragraph>Set the minimum cart total required to trigger the free gift.</s-paragraph>
          <s-money-field
            label="Minimum cart total"
            currency="EUR"
            value={settings.CART_TOTAL_THRESHOLD}
            disabled={loading}
            onInput={(e) => updateSetting("CART_TOTAL_THRESHOLD", parseFloat(e.target.value || 0))}
          />
        </s-stack>
      </s-section>

      <s-section heading="Free gift product">
        <s-stack gap="base">
          <s-paragraph>Select the product variant that will be added as a free gift.</s-paragraph>
          <VariantSkuPicker
            label="Gift variant"
            value={settings.FREE_GIFT_SKU}
            disabled={loading}
            onChange={(sku) => updateSetting("FREE_GIFT_SKU", sku)}
            onError={(msg) => setBanner({ message: msg, tone: "critical" })}
          />
        </s-stack>
      </s-section>
    </s-page>
  );
}
