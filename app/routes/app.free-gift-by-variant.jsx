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
  // const isActive = status?.status === "ACTIVE";
  const [isActive, setIsActive] = useState(status?.status === "ACTIVE");


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


  async function handleStatusToggle(newStatus) {
    if (!discountId) return toastError("Discount ID not found.");

    setLoading(true);
    try {
      const res = await fetch(ACTIVATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountId,
          settings,
          requestedStatus: newStatus,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setIsActive(newStatus === "ACTIVE");
        toastSuccess(
          `Discount ${newStatus.toLowerCase()}d and settings saved!`
        );
      } else {
        toastError("Error: " + JSON.stringify(data.errors || data.error));
      }
    } catch (err) {
      toastError("Local JS Error: " + err.message);
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
        <s-stack gap="200">
          <div style={{ marginBottom: "10px", display: "flex", flexDirection: "row", gap: "10px"}}>
            <s-heading variant="headingMd">
              Free gift triggered by variant
            </s-heading>
            {isEdit && status && (
              <s-badge tone={isActive ? "success" : "info"}>
                {isActive ? "Active" : "Inactive"}
              </s-badge>
            )}
          </div>

          <div style={{maxWidth: "60%"}}>
            <s-text-field
              label="Discount name:"
              value={title}
              disabled={loading}
              onInput={(e) => setTitle(e.target.value)}
            />

            <s-text-field
              label="Trigger variant SKU:"
              value={(settings.triggerSku || "").toString()}
              disabled={loading}
              onInput={(e) => updateSetting("triggerSku", e.target.value)}
            />

            <s-text-field
              label="Gift variant SKU:"
              value={(settings.giftSku || "").toString()}
              disabled={loading}
              onInput={(e) => updateSetting("giftSku", e.target.value)}
            />
          </div>

          {isEdit && (
          <s-inline-stack gap="200" wrap>
            <div style={{ display: "flex", flexDirection: "row", gap: "10px", margin: "10px 0"}}>

              <s-button
                onClick={() => handleStatusToggle("ACTIVE")}
                disabled={isActive || loading}
              >
                Activate
              </s-button>

              <s-button
                onClick={() => handleStatusToggle("DEACTIVE")}
                disabled={!isActive || loading}
              >
                Deactivate
              </s-button>

              <s-button
                tone="critical"
                onClick={() => setConfirmOpen(true)}
                disabled={loading}
              >
                Delete discount
              </s-button>
            </div>
            </s-inline-stack>
          )}

          <div style={{marginTop: "10px"}}>  
            <s-button
              onClick={isEdit ? handleSave : handleCreate}
              disabled={loading}
            >
              {loading
                ? "Processing..."
                : isEdit
                ? "Save changes"
                : "Create discount"}
            </s-button>
          </div>
        </s-stack>
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