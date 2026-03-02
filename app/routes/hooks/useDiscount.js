import { useState } from "react";

const CREATE_PATH = "/api/discount/create";
const ACTIVATE_PATH = "/api/discount/activate";
const DELETE_PATH = "/api/discount/delete";

export function useDiscount({ type, navigate, discountId }) {
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState(null);

  const bannerError = (message) =>
    setBanner({ message, tone: "critical" });

  const bannerSuccess = (message) =>
    setBanner({ message, tone: "success" });

  async function create({ title, settings }) {
    setLoading(true);
    setBanner(null);

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
      setTimeout(() => navigate("/app"), 700);
    } catch (e) {
      bannerError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function save({ settings, requestedStatus }) {
    if (!discountId) return bannerError("Missing discount ID");

    setLoading(true);
    setBanner(null);

    try {
      const res = await fetch(ACTIVATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountId,
          settings,
          requestedStatus,
          type,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        return bannerError(data.error || "Error saving changes");
      }

      bannerSuccess("Changes saved successfully!");
      setTimeout(() => navigate("/app"), 700);
    } catch (e) {
      bannerError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus({ settings, newStatus }) {
    if (!discountId) return bannerError("Missing discount ID");

    setLoading(true);
    setBanner(null);

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
        return bannerError(data.error || "Error updating status");
      }

      bannerSuccess(
        newStatus === "ACTIVE"
          ? "Discount activated successfully!"
          : "Discount deactivated successfully!"
      );
    } catch (e) {
      bannerError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!discountId) return bannerError("Missing discount ID");

    setLoading(true);
    setBanner(null);

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

      navigate("/app");
    } catch (e) {
      bannerError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    banner,
    setBanner,
    create,
    save,
    toggleStatus,
    remove,
  };
}