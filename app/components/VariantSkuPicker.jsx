/* eslint-disable react/prop-types */
/* eslint-disable no-undef */
import { useMemo, useState } from "react";

function VariantPreview({ variant }) {
  const productTitle =
    typeof variant?.productTitle === "string" ? variant.productTitle.trim() : "";
  const sku = typeof variant?.sku === "string" ? variant.sku.trim() : "";
  const fallbackTitle = sku
    ? `SKU ${sku}`
    : variant?.variantId
      ? "Selected variant"
      : "Untitled product";

  return (
    <s-stack direction="inline" gap="small-200" alignItems="center">
      {variant.image ? (
        <s-thumbnail src={variant.image} size="small" alt={variant.title || variant.productTitle || "Variant"} />
      ) : (
        <s-icon type="image-none" tone="neutral" />
      )}

      <s-stack gap="none">
        <s-text type="strong">{productTitle || fallbackTitle}</s-text>
        {variant.title?.trim() && variant.title.trim() !== "Default Title" && (
          <s-text color="subdued">{variant.title}</s-text>
        )}
      </s-stack>
    </s-stack>
  );
}

function getVariantIdentity(variant) {
  if (variant?.variantId) return `variant:${variant.variantId}`;
  if (variant?.productId && variant?.sku) return `product-sku:${variant.productId}:${variant.sku}`;
  if (variant?.sku) return `sku:${variant.sku}`;
  return null;
}

function extractId(value) {
  if (!value) return null;

  const raw = String(value);
  if (raw.startsWith("gid://")) return raw;

  if (/^\d+$/.test(raw)) {
    return `gid://shopify/ProductVariant/${raw}`;
  }

  return raw;
}

function extractProductId(value) {
  if (!value) return null;

  const raw = String(value);
  if (raw.startsWith("gid://")) return raw;

  if (/^\d+$/.test(raw)) {
    return `gid://shopify/Product/${raw}`;
  }

  return raw;
}

function getProductVariants(product) {
  if (Array.isArray(product?.variants)) return product.variants;

  if (Array.isArray(product?.variants?.edges)) {
    return product.variants.edges
      .map((edge) => edge?.node)
      .filter(Boolean);
  }

  return [];
}

export default function VariantSkuPicker({
  label,
  value,
  multiple = false,
  disabled = false,
  compact = false,
  allowVariantsWithoutSku = false,
  onChange,
  onError,
}) {
  const [loading, setLoading] = useState(false);

  const selectedCount = useMemo(() => {
    if (Array.isArray(value)) return value.length;
    return value ? 1 : 0;
  }, [value]);

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
      let skippedUntrackable = 0;

      selection.forEach((product) => {
        const variants = getProductVariants(product);

        variants.forEach((variant) => {
          const hasSku = Boolean(variant.sku && variant.sku.trim());
          const variantId = extractId(
            variant.id ||
            variant.admin_graphql_api_id ||
            variant.adminGraphqlApiId ||
            variant.graphql_api_id ||
            variant.graphqlApiId
          );
          const productId = extractProductId(
            product.id ||
            product.admin_graphql_api_id ||
            product.adminGraphqlApiId ||
            product.graphql_api_id ||
            product.graphqlApiId
          );

          if (!hasSku && !allowVariantsWithoutSku) return;
          if (!hasSku && !variantId) {
            skippedUntrackable += 1;
            return;
          }

          selectedVariants.push({
            sku: hasSku ? variant.sku.trim() : null,
            variantId,
            productId,
            title: variant.title || "",
            productTitle: product.title || "",
            image:
              variant.image?.originalSrc ||
              product.images?.[0]?.originalSrc ||
              product.images?.[0]?.src ||
              product.media?.[0]?.preview?.image?.url ||
              null,
          });
        });
      });

      if (!selectedVariants.length) {
        onError?.(
          allowVariantsWithoutSku
            ? "No usable variants found. Add SKU or select variants with IDs."
            : "Selected variants must have a SKU."
        );
        return;
      }

      if (skippedUntrackable > 0) {
        onError?.(
          `${skippedUntrackable} variant(s) were skipped because they have no SKU and no stable variant ID.`
        );
      }

      if (multiple) {
        const merged = [...(value || []), ...selectedVariants].filter(
          (variant, index, source) => {
            const identity = getVariantIdentity(variant);
            if (!identity) return false;
            return index === source.findIndex((entry) => getVariantIdentity(entry) === identity);
          }
        );

        onChange(merged);
        return;
      }

      onChange(selectedVariants[0]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <s-stack gap="small-300">
      <s-stack direction="inline" justifyContent="space-between" alignItems="center">
        <s-text type="strong">{label}</s-text>
        {selectedCount > 0 && <s-badge tone="info">{selectedCount} selected</s-badge>}
      </s-stack>

      <s-button variant="secondary" disabled={disabled || loading} onClick={openPicker}>
        {multiple
          ? selectedCount > 0
            ? "Add variants"
            : "Select variants"
          : value
            ? "Change variant"
            : "Select variant"}
      </s-button>

      {multiple ? (
        Array.isArray(value) && value.length > 0 ? (
          <s-table variant="auto">
            <s-table-header-row>
              <s-table-header>Product</s-table-header>
              <s-table-header>Variant</s-table-header>
              <s-table-header>SKU</s-table-header>
              <s-table-header>Actions</s-table-header>
            </s-table-header-row>

            <s-table-body>
              {value.map((variant, index) => (
                <s-table-row key={getVariantIdentity(variant) || `${variant.productId}-${index}`}>
                  <s-table-cell>
                    <VariantPreview variant={variant} />
                  </s-table-cell>

                  <s-table-cell>
                    <s-text color="subdued">
                      {variant.title?.trim() && variant.title.trim() !== "Default Title"
                        ? variant.title
                        : "Default"}
                    </s-text>
                  </s-table-cell>

                  <s-table-cell>
                    <s-text color={variant.sku ? "base" : "subdued"}>
                      {variant.sku || "No SKU"}
                    </s-text>
                  </s-table-cell>

                  <s-table-cell>
                    <s-button
                      tone="critical"
                      variant="secondary"
                      disabled={disabled}
                      onClick={() => onChange(value.filter((_, i) => i !== index))}
                    >
                      Remove
                    </s-button>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        ) : (
          <s-paragraph color="subdued">No variants selected.</s-paragraph>
        )
      ) : compact ? (
        value ? (
          <s-box
            padding="small-300"
            border="base"
            borderColor="base"
            borderRadius="base"
          >
            <s-stack gap="small-200">
              <s-stack direction="inline" justifyContent="space-between" alignItems="center">
                <VariantPreview variant={value} />

                <s-stack direction="inline" gap="small-200" alignItems="center">
                  <s-button
                    variant="secondary"
                    disabled={disabled || loading}
                    onClick={openPicker}
                  >
                    Change
                  </s-button>

                  <s-button
                    tone="critical"
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => onChange(null)}
                  >
                    Remove
                  </s-button>
                </s-stack>
              </s-stack>

              <s-text color={value.sku ? "subdued" : "subdued"}>
                {value.sku ? `SKU: ${value.sku}` : "SKU not set"}
              </s-text>
            </s-stack>
          </s-box>
        ) : (
          <s-box
            padding="small-300"
            border="base"
            borderColor="base"
            borderRadius="base"
          >
            <s-paragraph color="subdued">No variant selected.</s-paragraph>
          </s-box>
        )
      ) : value ? (
        <s-table variant="auto">
          <s-table-header-row>
            <s-table-header>Product</s-table-header>
            <s-table-header>Variant</s-table-header>
            <s-table-header>SKU</s-table-header>
            <s-table-header>Actions</s-table-header>
          </s-table-header-row>

          <s-table-body>
            <s-table-row>
              <s-table-cell>
                <VariantPreview variant={value} />
              </s-table-cell>

              <s-table-cell>
                <s-text color="subdued">
                  {value.title?.trim() && value.title.trim() !== "Default Title"
                    ? value.title
                    : "Default"}
                </s-text>
              </s-table-cell>

              <s-table-cell>
                <s-text color={value.sku ? "base" : "subdued"}>{value.sku || "No SKU"}</s-text>
              </s-table-cell>

              <s-table-cell>
                <s-button
                  tone="critical"
                  variant="secondary"
                  disabled={disabled}
                  onClick={() => onChange(null)}
                >
                  Remove
                </s-button>
              </s-table-cell>
            </s-table-row>
          </s-table-body>
        </s-table>
      ) : (
        <s-paragraph color="subdued">No variant selected.</s-paragraph>
      )}
    </s-stack>
  );
}
