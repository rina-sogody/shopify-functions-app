/* eslint-disable no-undef */
import { useState, useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";

import { getDiscountStatus } from "./api/getDiscountStatus";
import { metadata } from "../extensions/free-gift";

import Breadcrumbs from "../components/Breadcrumbs";
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";

export async function loader({ request }) {
  const url = new URL(request.url);
  const discountId = url.searchParams.get("discountId");

  const status = await getDiscountStatus({
    request,
    discountId,
    type: "freeGift",
  });

  return {
    status,
    discountId,
    mode: discountId ? "edit" : "create",
  };
}

const CREATE_PATH = "/api/discount/create";
const ACTIVATE_PATH = "/api/discount/activate";
const DELETE_PATH = "/api/free-gift-discount/delete";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData();

  const isEdit = mode === "edit";
  const hasDiscount = isEdit && Boolean(status);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [title, setTitle] = useState(status?.title || "");
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isActive, setIsActive] = useState(status?.status === "ACTIVE");

  const [settings, setSettings] = useState(() => {
    const initial = {};
    metadata.settings.forEach((s) => (initial[s.key] = s.default));
    return initial;
  });

  const toastSuccess = (message) => setToast({ message, tone: "success" });
  const toastError = (message) => setToast({ message, tone: "error" });

  function validateForm() {
    if (!title?.trim()) {
      toastError("Discount title is required");
      return false;
    }

    if (!settings?.FREE_GIFT_SKU?.trim()) {
      toastError("Free gift SKU is required");
      return false;
    }

    return true;
  }

  const handleSettingChange = (key, value) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    if (!status?.metafield?.value) return;

    try {
      const parsed = JSON.parse(status.metafield.value);

      setSettings({
        CART_TOTAL_THRESHOLD: parsed.threshold
          ? parsed.threshold / 100
          : metadata.settings.find((s) => s.key === "CART_TOTAL_THRESHOLD")
              ?.default,
        FREE_GIFT_SKU: parsed.sku || "",
      });
    } catch (e) {
      console.error("Metafield parse error", e);
    }
  }, [status]);

  async function handleCreateDiscount() {
    if (!validateForm()) return;

    setCreating(true);
    try {
      const res = await fetch(CREATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          settings: {
            CART_TOTAL_THRESHOLD: Math.round(
              settings.CART_TOTAL_THRESHOLD * 100
            ),
            FREE_GIFT_SKU: settings.FREE_GIFT_SKU,
          },
          type: "freeGift"
        }),
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
      setCreating(false);
    }
  }

  async function handleSaveChanges() {
    if (!discountId) return toastError("Discount ID missing");
    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await fetch(ACTIVATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountId,
          settings: {
            CART_TOTAL_THRESHOLD: Math.round(
              settings.CART_TOTAL_THRESHOLD * 100
            ),
            FREE_GIFT_SKU: settings.FREE_GIFT_SKU,
          },
          requestedStatus: isActive ? "ACTIVE" : "DEACTIVE",
          type: "freeGift",
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
          type: "freeGift",
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
          <div style={{ display: "flex", flexDirection: "row", gap: "10px", marginBottom: "10px"}}>
            <s-heading variant="headingMd">{metadata.name}</s-heading>
            {hasDiscount && (
              <s-badge tone={isActive ? "success" : "info"}>
                {isActive ? "Active" : "Inactive"}
              </s-badge>
            )}
          </div>
          <s-text tone="subdued">{metadata.description}</s-text>
          
          <div style={{ width: "40%", marginTop: "10px"}}>
            
          <s-text-field
            label="Discount name"
            value={title}
            disabled={creating}
            onInput={(e) => setTitle(e.target.value)}
          />
          </div>

          <s-stack gap="200">
          <div
            style={{
              display: "flex",
              gap: 20,
              alignItems: "flex-end",
              flexWrap: "wrap",
              margin: "10px 0"
            }}
          >
            {metadata.settings.map((setting) => (
              <div key={setting.key} style={{ minWidth: 220 }}>
                <s-text-field
                  label={setting.label}
                  type={setting.type}
                  value={(settings[setting.key] ?? "").toString()}
                  disabled={loading || creating}
                  onInput={(e) =>
                    handleSettingChange(
                      setting.key,
                      setting.type === "number"
                        ? parseFloat(e.target.value || 0)
                        : e.target.value
                    )
                  }
                />
              </div>
            ))}
          </div>
          </s-stack>

        {isEdit && (
          <s-inline-stack gap="200" wrap>
            <div style={{ display: "flex", flexDirection: "row", gap: "10px", marginBottom: "10px"}}>

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
        </s-stack>

        <s-button
            onClick={isEdit ? handleSaveChanges : handleCreateDiscount}
            disabled={creating}
          >
            {creating
              ? isEdit
                ? "Saving..."
                : "Creating..."
              : isEdit
              ? "Save changes"
              : "Create free gift discount"}
          </s-button>
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