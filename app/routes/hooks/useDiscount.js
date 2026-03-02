import { useState } from "react";

const CREATE_PATH = "/api/discount/create";
const ACTIVATE_PATH = "/api/discount/activate";
const DELETE_PATH = "/api/discount/delete";

export function useDiscount({ type, navigate, discountId }) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const toastError = (message) => setToast({ message, tone: "error" });
  const toastSuccess = (message) => setToast({ message, tone: "success" });

  async function create({ title, settings }) {
    setLoading(true);
    try {
      const res = await fetch(CREATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, settings, type }),
      });

      const data = await res.json();
      if (!data.success) return toastError(data.error || "Error creating");

      toastSuccess("Created!");
      setTimeout(() => navigate("/app"), 700);
    } catch (e) {
      toastError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function save({ settings, requestedStatus }) {
    if (!discountId) return toastError("Missing ID");

    setLoading(true);
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
      if (!data.success) return toastError(data.error || "Error saving");

      toastSuccess("Saved!");
      setTimeout(() => navigate("/app"), 700);
    } catch (e) {
      toastError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus({ settings, newStatus }) {
    if (!discountId) return toastError("Missing ID");

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
      if (!data.success) return toastError(data.error);

      toastSuccess("Status updated!");
    } catch (e) {
      toastError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    if (!discountId) return;

    setLoading(true);
    try {
      const res = await fetch(DELETE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountId }),
      });

      const data = await res.json();
      if (!data.success) return toastError("Delete error");

      navigate("/app");
    } catch (e) {
      toastError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    toast,
    setToast,
    create,
    save,
    toggleStatus,
    remove,
  };
}