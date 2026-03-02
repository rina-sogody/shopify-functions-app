/* eslint-disable react/prop-types */
/* eslint-disable no-undef */
import { useState } from "react";

export default function VariantSkuPicker({
  label,
  value,
  multiple = false,
  disabled = false,
  onChange,
  onError,
}) {
  const [loading, setLoading] = useState(false);

  async function openPicker() {
    if (!window.shopify?.resourcePicker) return;

    setLoading(true);

    try {
      const selection = await window.shopify.resourcePicker({
        type: "product",
        multiple,
        filter: { variants: true },
      });

      if (!selection || !selection.length) return;

      const selectedVariants = [];

      selection.forEach((product) => {
        product.variants?.forEach((variant) => {
          if (!variant.sku) return;

          selectedVariants.push({
            sku: variant.sku,
            variantId: variant.id,
            productId: product.id,
            title: variant.title,
            productTitle: product.title,
          });
        });
      });

      if (!selectedVariants.length) {
        onError?.("Selected variant has no SKU.");
        return;
      }

      if (multiple) {
        const merged = [
          ...(value || []),
          ...selectedVariants,
        ].filter(
          (v, index, self) =>
            index === self.findIndex((x) => x.sku === v.sku)
        );

        onChange(merged);
      } else {
        onChange(selectedVariants[0]);
      }
    } finally {
      setLoading(false);
    }
  }

  const isMultiple = Array.isArray(value);

  return (
    <div>
      <s-text tone="subdued">{label}</s-text>

      {isMultiple ? (
        <>
          <s-button
            variant="secondary"
            disabled={disabled || loading}
            onClick={openPicker}
          >
            Select variants
          </s-button>

          {value?.map((variant, index) => (
            <div
              key={variant.sku}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                {/* <s-thumbnail
                  source={variant.image}
                  size="small"
                  alt={variant.title}
                /> */}

                <div style={{ display: "flex", flexDirection: "column" }}>
                  <s-text>{variant.productTitle}</s-text>
                  <s-text tone="subdued">{variant.title}</s-text>
                  <s-text tone="subdued">SKU: {variant.sku}</s-text>
                </div>
              </div>

              <s-button
                tone="critical"
                size="slim"
                disabled={disabled}
                onClick={() =>
                  onChange(value.filter((_, i) => i !== index))
                }
              >
                Remove
              </s-button>
            </div>
          ))}
        </>
      ) : value ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {value?.image && (
              <s-thumbnail
                source={value.image}
                size="small"
                alt={value.title}
              />
            )}

            <div style={{ display: "flex", flexDirection: "column" }}>
              <s-text>{value.productTitle}</s-text>
              <s-text tone="subdued">{value.title}</s-text>
              <s-text tone="subdued">SKU: {value.sku}</s-text>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <s-button
              variant="secondary"
              disabled={disabled || loading}
              onClick={openPicker}
            >
              Change
            </s-button>

            <s-button
              tone="critical"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              Remove
            </s-button>
          </div>
        </div>
      ) : (
        <s-button
          variant="secondary"
          disabled={disabled || loading}
          onClick={openPicker}
        >
          Select variant
        </s-button>
      )}
    </div>
  );
}