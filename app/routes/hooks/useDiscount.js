import { useState } from "react";

import { showToast } from "../../utils/toast";

const CREATE_PATH = "/api/discount/create";
const ACTIVATE_PATH = "/api/discount/activate";
const DELETE_PATH = "/api/discount/delete";

export function useDiscount({ type, navigate, discountId }) {
  const [loading, setLoading] = useState(false);

  const setBanner = (banner) => {
    if (!banner?.message) return;
    showToast(banner.message, banner.tone);
  };

  const bannerError = (message) => setBanner({ message, tone: "critical" });
  const bannerSuccess = (message) => setBanner({ message, tone: "success" });

  const getErrorMessage = (data, fallback) => {
    if (data?.error) return data.error;

    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      const first = data.errors[0];
      if (typeof first === "string") return first;
      if (first?.message) return first.message;
    }

    return fallback;
  };

  async function create({ title, settings }) {
    setLoading(true);

    try {
      const res = await fetch(CREATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, settings, type }),
      });

      const data = await res.json();

      if (!data.success) {
        return bannerError(data.error || "Error creating discount");
      }

      bannerSuccess("Discount created successfully!");

      const createdDiscountId = data?.discount?.nodeId;
      if (createdDiscountId && !discountId) {
        const pathname = typeof window !== "undefined" ? window.location.pathname : "";
        if (pathname) {
          navigate(`${pathname}?discountId=${encodeURIComponent(createdDiscountId)}`, {
            replace: true,
          });
        }
      }
    } catch (error) {
      bannerError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function save({ settings, requestedStatus, title }) {
    if (!discountId) return bannerError("Missing discount ID");

    setLoading(true);

    try {
      const res = await fetch(ACTIVATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountId,
          settings,
          requestedStatus,
          title,
          type,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        return bannerError(getErrorMessage(data, "Error saving changes"));
      }

      bannerSuccess("Changes saved successfully!");
    } catch (error) {
      bannerError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus({ settings, newStatus }) {
    if (!discountId) return bannerError("Missing discount ID");

    setLoading(true);

    try {
      const res = await fetch(ACTIVATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountId,
          settings,
          requestedStatus: newStatus,
          type,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        return bannerError(getErrorMessage(data, "Error updating status"));
      }

      bannerSuccess(
        newStatus === "ACTIVE"
          ? "Discount activated successfully!"
          : "Discount deactivated successfully!"
      );
    } catch (error) {
      bannerError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!discountId) return bannerError("Missing discount ID");

    setLoading(true);

    try {
      const res = await fetch(DELETE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountId }),
      });

      const data = await res.json();

      if (!data.success) {
        return bannerError("Error deleting discount");
      }

      showToast("Discount deleted", "success");
      navigate("/app");
    } catch (error) {
      bannerError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    banner: null,
    setBanner,
    create,
    save,
    toggleStatus,
    remove,
  };
}
