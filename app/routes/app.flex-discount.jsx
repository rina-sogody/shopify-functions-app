import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { getDiscountStatus } from "./api/getDiscountStatus";
import { metadata } from "../extensions/flex-discount"; 
import Breadcrumbs from "../components/Breadcrumbs"
import ConfirmModal from "../components/ConfirmModal";
import Toast from "../components/Toast";


export async function loader({ request }) {
  const url = new URL(request.url);
  const discountId = url.searchParams.get("discountId");

  const status = await getDiscountStatus({
    request,
    discountId,
    type: "flex",
  });

  return {
    status,
    discountId,
    mode: discountId ? "edit" : "create",
  };
}

export default function FlexDiscountPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData();
  const isEdit = mode === "edit";
  const hasDiscount = isEdit && Boolean(status);
  const [isActive, setIsActive] = useState(status?.status === "ACTIVE");


  const [title, setTitle] = useState(status?.title || "");
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState(() => {
    if (status?.metafield?.value) {
      try {
        const parsed = JSON.parse(status.metafield.value);
  
        return {
          tiers: parsed.tiers || [],
          eligibleSkus: parsed.eligibleSkus || [],
        };
      } catch {
        return {
          tiers: [],
          eligibleSkus: [],
        };
      }
    }
  
    return {
      tiers: [],
      eligibleSkus: [],
    };
  });
  const [toast, setToast] = useState(null);
  
  const toastSuccess = (message) => setToast({ message, tone: "success" });
  const toastError = (message) => setToast({ message, tone: "error" });

  const CREATE_PATH = "/api/flex-discount/create";
  const ACTIVATE_PATH = "/api/flex-discount/activate";
  const DELETE_PATH = "/api/flex-discount/delete";

  function validate() {
    if (!title?.trim()) {
      toastError("Discount name is required");
      return false;
    }
  
    if (!settings?.tiers?.length) {
      toastError("At least one discount tier is required");
      return false;
    }
  
    for (const tier of settings.tiers) {
      if (tier.threshold === undefined || tier.threshold === null) {
        toastError("Threshold is required");
        return false;
      }
  
      if (isNaN(tier.threshold) || tier.threshold <= 0) {
        toastError("Threshold must be greater than 0");
        return false;
      }
  
      if (isNaN(tier.percent) || tier.percent <= 0 || tier.percent > 100) {
        toastError("Discount percent must be between 1 and 100");
        return false;
      }
    }
  
    return true;
  }

  function getSortedSettings() {
    const sorted = [...settings.tiers].sort(
      (a, b) => a.threshold - b.threshold
    );
  
    return {
      tiers: sorted,
      eligibleSkus: settings.eligibleSkus || [],
    };
  }
  

  async function handleCreate() {
    if (!validate()) return;
  
    setLoading(true);
  
    try {
      const res = await fetch(CREATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          settings: getSortedSettings(),
        }),
      });
  
      const data = await res.json();
  
      if (!data.success) {
        toastError(data.error || "Error creating discount");
        return;
      }
  
      setToast({ message: "Discount created successfully!", tone: "success" });
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
          settings: getSortedSettings(),
          requestedStatus: status?.status || "ACTIVE",
        }),
      });
  
      const data = await res.json();
  
      if (!data.success) {
        toastError(data.error || "Error saving discount");
        return;
      }
  
      setToast({ message: "Discount updated successfully!", tone: "success" });
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
      setTimeout(() => navigate("/app"), 700);
    } catch (err) {
      toastError(err.message);
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  }

  return (
    <s-page
      backAction={{ content: "Discounts", url: "/app" }}
    >
      <Breadcrumbs/>
      <s-section>
        <div style={{marginBottom: "10px"}}>

      <s-stack gap="100">
      <div style={{ display: "flex", flexDirection: "row", gap: "10px", marginBottom: "10px"}}>
            <s-heading variant="headingMd">{metadata.name}</s-heading>
            {hasDiscount && (
              <s-badge tone={isActive ? "success" : "info"}>
                {isActive ? "Active" : "Inactive"}
              </s-badge>
            )}
          </div>
        <s-paragraph tone="subdued">{metadata.description}</s-paragraph>
      </s-stack>
        </div>

      <div style={{width: "60%"}}>
        <s-text-field
          label="Discount name"
          value={title}
          disabled={loading}
          onInput={(e) => setTitle(e.target.value)}
        />
      </div>

      <div style={{width: "60%", marginTop: "10px"}}>
      <s-section heading="Discount tiers">
        <s-stack gap="200">
          {settings.tiers.map((tier, index) => (
            <div
            key={index}
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "20px",
              marginBottom: "10px"
            }}
            >
            <div style={{ width: 120 }}>
              <s-text-field
                label="Spend (€)"
                type="number"
                value={(tier.threshold / 100).toString()}
                disabled={loading}
                onInput={(e) => {
                  const value = parseFloat(e.target.value || 0);
                  const updated = [...settings.tiers];
                  updated[index].threshold = Math.round(value * 100);
                  setSettings({ ...settings, tiers: updated });
                }}
              />
            </div>

            <div style={{ width: 120 }}>
              <s-text-field
                label="Discount %"
                type="number"
                value={tier.percent.toString()}
                disabled={loading}
                onInput={(e) => {
                  const updated = [...settings.tiers];
                  updated[index].percent = parseInt(e.target.value || 0, 10);
                  setSettings({ ...settings, tiers: updated });
                }}
              />
            </div>

            <s-button
              tone="critical"
              disabled={loading}
              onClick={() =>
                setSettings({
                  ...settings,
                  tiers: settings.tiers.filter((_, i) => i !== index),
                })
              }
            >
              Remove
            </s-button>
            </div>
          ))}

          <s-button
            variant="secondary"
            disabled={loading}
            onClick={() =>
              setSettings({
                ...settings,
                tiers: [...settings.tiers, { threshold: 0, percent: 10, message: "" }],
              })
            }
            style={{ marginTop: "20px;"}}
          >
            + Add tier
          </s-button>
        </s-stack>
      </s-section>
      </div>
      
      <s-section heading="Eligible products (SKUs)">
        {settings.eligibleSkus?.map((sku, index) => (
          <s-inline-stack key={index} gap="200">
            <div
            style={{display: "flex",
              flexDirection: "row",
              alignItems: "flex-end",
              gap: "20px",
              marginBottom: "10px"
            }}>

            <s-text-field
              value={sku}
              disabled={loading}
              onInput={(e) => {
                const updated = [...settings.eligibleSkus];
                updated[index] = e.target.value;
                setSettings({ ...settings, eligibleSkus: updated });
              }}
            />

            <s-button
              tone="critical"
              disabled={loading}
              onClick={() =>
                setSettings({
                  ...settings,
                  eligibleSkus: settings.eligibleSkus.filter((_, i) => i !== index),
                })
              }
            >
              Remove
            </s-button>
            </div>
          </s-inline-stack>
        ))}

        <s-button
          variant="secondary"
          disabled={loading}
          onClick={() =>
            setSettings({
              ...settings,
              eligibleSkus: [...(settings.eligibleSkus || []), ""],
            })
          }
        >
          + Add SKU
        </s-button>
      </s-section>

        {isEdit && (
          <s-inline-stack gap="200" wrap>
            <div style={{ display: "flex", flexDirection: "row", gap: "10px", marginTop: "10px", marginBottom: "20px"}}>

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

        <div style={{ marginTop: "10px" }}>
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
