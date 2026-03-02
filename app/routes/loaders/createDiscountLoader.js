import { getDiscountStatus } from "../api/getDiscountStatus";

export function createDiscountLoader(type) {
  return async ({ request }) => {
    const url = new URL(request.url);
    const discountId = url.searchParams.get("discountId");

    let status = null;
    if (discountId) {
      try {
        status = await getDiscountStatus({ request, discountId, type });
      } catch {
        console.log("error");
      }
    }

    return {
      status,
      discountId,
      mode: discountId ? "edit" : "create",
    };
  };
}