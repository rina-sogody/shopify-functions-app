function normalizeFlexTiers(tiers = []) {
  const normalized = (Array.isArray(tiers) ? tiers : [])
    .map((tier) => {
      const threshold = Number(tier?.threshold);
      const percent = Number(tier?.percent);

      if (!Number.isFinite(threshold) || threshold <= 0) return null;
      if (!Number.isFinite(percent) || percent <= 0 || percent > 100) return null;

      const normalizedPercent = Math.round(percent * 100) / 100;
      const normalizedThreshold = Math.round(threshold);

      return {
        threshold: normalizedThreshold,
        percent: normalizedPercent,
        message:
          typeof tier?.message === "string" && tier.message.trim()
            ? tier.message.trim()
            : `${normalizedPercent}% off`,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.threshold - b.threshold);

  return normalized.filter(
    (tier, index) =>
      index === normalized.findIndex((entry) => entry.threshold === tier.threshold)
  );
}

function normalizeFlexEligibleSkus(eligibleSkus = []) {
  const normalized = (Array.isArray(eligibleSkus) ? eligibleSkus : [])
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

  return normalized.filter(
    (entry, index) =>
      index ===
      normalized.findIndex(
        (candidate) =>
          candidate.variantId === entry.variantId && candidate.sku === entry.sku
      )
  );
}

export const discountConfig = {
  flex: {
    namespace: "flex-discount",
    functionHandle: "flex-discount",
    discountClasses: ["PRODUCT"],
    registrationType: "flex-discount",
    transformSettings: (settings = {}) => ({
      tiers: normalizeFlexTiers(settings.tiers),
      eligibleSkus: normalizeFlexEligibleSkus(settings.eligibleSkus),
    }),
  },

  freeGiftVariant: {
    namespace: "free-gift-by-variant",
    functionHandle: "free-gift-by-variant",
    discountClasses: ["PRODUCT"],
    registrationType: "free-gift-by-variant",
    transformSettings: (settings) => settings,
  },

  freeGift: {
    namespace: "free-gift",
    functionHandle: "free-gift-discount",
    discountClasses: ["PRODUCT"],
    registrationType: "free-gift",
    transformSettings: (settings) => ({
      threshold: settings.CART_TOTAL_THRESHOLD,
      sku: settings.FREE_GIFT_SKU,
    }),
  },

  reject: {
    namespace: "reject-discounts",
    functionHandle: "reject-discounts",
    discountClasses: ["PRODUCT", "ORDER"],
    registrationType: "reject-discounts",
    transformSettings: (settings) => ({
      message: settings?.message || "",
    }),
  },
};
