import { useState, useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";

import { getDiscountStatus } from "./api/getDiscountStatus";

import Breadcrumbs from "../components/Breadcrumbs";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";


export async function loader({ request }) {
  const url = new URL(request.url);
  const discountId = url.searchParams.get("discountId");

  let status = null;

  if (discountId) {
    try {
      status = await getDiscountStatus({
        request,
        discountId,
        type: "freeGiftVariant",
      });
    } catch {
      status = null;
    }
  }

  return {
    status,
    discountId,
    mode: discountId ? "edit" : "create",
  };
}


const CREATE_PATH = "/api/free-gift-by-variant/create";
const ACTIVATE_PATH = "/api/free-gift-by-variant/activate";
const DELETE_PATH = "/api/free-gift-by-variant/delete";

export default function FreeGiftVariantPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData() || {};

  const isEdit = mode === "edit";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [title, setTitle] = useState(status?.title || "");
  const [settings, setSettings] = useState({});

  const toastError = (message) => setToast({ message, tone: "error" });
  const toastSuccess = (message) => setToast({ message, tone: "success" });

  const updateSetting = (key, value) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  function validate() {
    if (!title?.trim()) {
      toastError("Discount name is required");
      return false;
    }

    if (!settings?.triggerSku?.trim()) {
      toastError("Trigger SKU is required");
      return false;
    }

    if (!settings?.giftSku?.trim()) {
      toastError("Gift SKU is required");
      return false;
    }

    return true;
  }

  useEffect(() => {
    if (!status?.metafield?.value) return;

    try {
      const parsed = JSON.parse(status.metafield.value);
      setSettings({
        triggerSku: parsed.triggerSku ?? "",
        giftSku: parsed.giftSku ?? "",
      });
    } catch (e) {
      console.error("Metafield parse error", e);
    }
  }, [status]);

  async function handleCreate() {
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(CREATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, settings }),
      });

      const data = await res.json();

      if (!data.success) {
        toastError(data.error || "Error creating discount");
        return;
      }

      toastSuccess("Discount created successfully!");
      setTimeout(() => navigate("/app"), 700);
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!discountId) return toastError("Discount ID missing");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch(ACTIVATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountId,
          settings,
          requestedStatus: status?.status || "ACTIVE",
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toastError(data.error || "Error saving changes");
        return;
      }

      toastSuccess("Settings updated successfully!");
      setTimeout(() => navigate("/app"), 700);
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!discountId) return;

    setLoading(true);
    try {
      const res = await fetch(DELETE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountId }),
      });

      const data = await res.json();

      if (!data.success) {
        toastError("Error deleting discount");
        return;
      }

      navigate("/app");
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  }

  return (
    <s-page backAction={{ content: "Discounts", url: "/app" }}>
      <Breadcrumbs />

      <s-section>
        <h2 style={{ fontSize: "17px", marginTop: 0 }}>
          Free Gift triggered by variant
        </h2>

        <div style={{ marginBottom: "1rem" }}>
          <label>
            Discount Name:{" "}
            <input
              type="text"
              value={title}
              disabled={loading}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>
            Trigger Variant SKU:{" "}
            <input
              type="text"
              value={settings.triggerSku || ""}
              disabled={loading}
              onChange={(e) => updateSetting("triggerSku", e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label>
            Gift Variant SKU:{" "}
            <input
              type="text"
              value={settings.giftSku || ""}
              disabled={loading}
              onChange={(e) => updateSetting("giftSku", e.target.value)}
            />
          </label>
        </div>

        <div style={{ marginTop: "1.5rem" }}>
          <s-button
            onClick={isEdit ? handleSave : handleCreate}
            disabled={loading}
            type="button"
          >
            {loading
              ? "Processing..."
              : isEdit
              ? "Save Changes"
              : "Create Discount"}
          </s-button>
        </div>

        {isEdit && (
          <div style={{ marginTop: "1rem" }}>
            <s-button
              tone="critical"
              onClick={() => setConfirmOpen(true)}
              disabled={loading}
              type="button"
            >
              Delete
            </s-button>
          </div>
        )}
      </s-section>

      {confirmOpen && (
        <ConfirmModal
          open={confirmOpen}
          title="Are you sure you want to delete this discount?"
          confirmLabel="Yes"
          cancelLabel="No"
          loading={loading}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={handleDeleteConfirmed}
        />
      )}

      <Toast
        message={toast?.message}
        tone={toast?.tone}
        onClose={() => setToast(null)}
      />
    </s-page>
  );
}