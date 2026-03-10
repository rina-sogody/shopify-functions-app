/* eslint-disable no-undef */
export function showToast(message, tone = "info") {
  if (!message) return;

  const shopify = globalThis?.shopify || globalThis?.window?.shopify;

  if (shopify?.toast?.show) {
    shopify.toast.show(message, {
      isError: tone === "critical",
    });
    return;
  }

  console[tone === "critical" ? "error" : "log"](message);
}
