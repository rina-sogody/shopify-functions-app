export const metadata = {
    name: "Free Gift by SKU",
    description:
      "Applies a free gift when a specific SKU is present in the cart.",
    settings: [
      {
        key: "TRIGGER_SKU",
        label: "Trigger SKU",
        type: "text",
        default: "",
      },
      {
        key: "GIFT_SKU",
        label: "Gift SKU",
        type: "text",
        default: "",
      },
    ],
  };
  