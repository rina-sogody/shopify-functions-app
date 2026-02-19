/* eslint-disable no-undef */
import { useState } from "react";
import { useLoaderData } from "react-router";
import { getStatus } from './api/free-gift-discount/status';
import { metadata } from "../extensions/free-gift";
import { useNavigate } from "react-router";


export async function loader({ request }) {
  const url = new URL(request.url);
  const discountId = url.searchParams.get("discountId");

  const status = await getStatus({
    request,
    discountId,
  });

  return {
    status,
    discountId,
    mode: discountId ? "edit" : "create",
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData();
  const isEdit = mode === "edit";
  const [title, setTitle] = useState(
    status?.title || ""
  );  
  const [creating, setCreating] = useState(false);
  const hasDiscount = isEdit && Boolean(status);


  const CREATE_PATH = "/api/free-gift-discount/create";


  async function handleCreateDiscount() {
    setCreating(true);
  
    try {
      const res = await fetch(CREATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          settings: {
            CART_TOTAL_THRESHOLD: Math.round(settings.CART_TOTAL_THRESHOLD * 100),
            FREE_GIFT_SKU: settings.FREE_GIFT_SKU,
          },
        }),
      });
  
      const data = await res.json();
  
      if (!data.success) {
        alert("Error creating discount: " + (data.error || "Unknown error"));
        return;
      }
  
      alert("Discount created successfully!");
      navigate("/app");
    } catch (err) {
      console.error(err);
      alert("Local JS error: " + err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveChanges() {
    if (!discountId) return;
  
    setLoading(true);
  
    try {
      const res = await fetch(ACTIVATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountId,
          settings: {
            CART_TOTAL_THRESHOLD: Math.round(settings.CART_TOTAL_THRESHOLD * 100),
            FREE_GIFT_SKU: settings.FREE_GIFT_SKU,
          },          
          requestedStatus: isActive ? "ACTIVE" : "DEACTIVE"
        }),
      });
  
      const data = await res.json();
  
      if (!data.success) {
        alert("Error saving changes");
        return;
      }
  
      alert("Settings updated successfully!");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  const [settings, setSettings] = useState(() => {
    if (status?.metafield?.value) {
      const parsed = JSON.parse(status.metafield.value);
  
      return {
        CART_TOTAL_THRESHOLD: parsed.threshold
          ? parsed.threshold / 100 
          : metadata.settings.find(s => s.key === "CART_TOTAL_THRESHOLD")?.default,
  
        FREE_GIFT_SKU: parsed.sku || ""
      };
    }
  
    const initial = {};
    metadata.settings.forEach((s) => {
      initial[s.key] = s.default;
    });
    return initial;
  });
  

  const [isActive, setIsActive] = useState(
    status?.status === "ACTIVE"
  );
  
  const [loading, setLoading] = useState(false);

  const ACTIVATE_PATH = "/api/free-gift-discount/activate";
  const DELETE_PATH = "/api/free-gift-discount/delete";


  async function handleStatusToggle(newStatus) {
    if (!discountId) return alert("Discount ID not found.");

    setLoading(true);
    try {
      const res = await fetch(ACTIVATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          discountId, 
          settings: settings,
          requestedStatus: newStatus 
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsActive(newStatus === "ACTIVE");
        alert(`Discount ${newStatus.toLowerCase()}d and settings saved!`);
      } else {
        alert("Error: " + JSON.stringify(data.errors || data.error));
      }
    } catch (err) {
      console.error(err);
      alert("Local JS Error: " + err.message); 
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!discountId) return;
  
    const confirmed = window.confirm(
      "Are you sure you want to delete this discount?"
    );
  
    if (!confirmed) return;
  
    setLoading(true);
  
    try {
      const res = await fetch(DELETE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountId }),
      });
  
      const data = await res.json();
  
      if (!data.success) {
        alert("Error deleting discount");
        return;
      }
  
      alert("Discount deleted successfully");
      navigate("/app");
  
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }
  


  function handleSettingChange(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
<s-page
  backAction={{ content: "Discounts", url: "/app" }}
>
  <s-section>
  <h2 style={{ fontSize: "17px", marginTop: "0"}}>{metadata.name}</h2>
    <p style={{ fontSize: "15px" }}>{metadata.description}</p>

      <s-section>
        <label>
          Discount name:{" "}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={creating}
          />
        </label>
        <s-section>
          {metadata.settings.map((setting) => (
            <div key={setting.key} style={{ marginBottom: "1rem" }}>
              <label>
                {setting.label}:{" "}
                <input
                  type={setting.type}
                  value={settings[setting.key]}
                  onChange={(e) =>
                    handleSettingChange(
                      setting.key,
                      setting.type === "number"
                        ? parseInt(e.target.value, 10)
                        : e.target.value
                    )
                  }
                  disabled={loading || creating}
                />
              </label>
            </div>
          ))}
        </s-section>
        <div style={{ marginTop: "1rem" }}>
        <s-button
          onClick={isEdit ? handleSaveChanges : handleCreateDiscount}
          disabled={creating}
        >
          {creating
            ? isEdit ? "Saving..." : "Creating..."
            : isEdit ? "Save changes" : "Create Free Gift Discount"}
        </s-button>
        </div>
      </s-section>

      {hasDiscount && (
        <s-section >
          <p>
            Status: <strong>{isActive ? "Active" : "Inactive"}</strong>
          </p>
        </s-section>
      )}

    {isEdit && (
      <s-section>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      
        <s-button
          onClick={() => handleStatusToggle("ACTIVE")}
          disabled={isActive || loading}
        >
          {loading ? "Processing..." : "Activate Free Gift Discount"}
        </s-button>

        <s-button
          onClick={() => handleStatusToggle("DEACTIVE")}
          disabled={!isActive || loading}
        >
          {loading ? "Processing..." : "Deactivate Free Gift Discount"}
        </s-button>

        <s-button
          tone="critical"
          onClick={handleDelete}
          disabled={loading}
        >
          Delete Discount
        </s-button>
      </div>
      </s-section>
    )}

  </s-section>

</s-page>

  );
}