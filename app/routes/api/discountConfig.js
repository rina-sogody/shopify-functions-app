export const discountConfig = {
  flex: {
    namespace: "flex-discount",
    functionHandle: "flex-discount",
    discountClasses: ["PRODUCT"],
    registrationType: "flex-discount",
    transformSettings: (settings) => ({
      tiers: settings.tiers,
      eligibleSkus: settings.eligibleSkus,
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
    transformSettings: () => ({ enabled: false }),
  },
};