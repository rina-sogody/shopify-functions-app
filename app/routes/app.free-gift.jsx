/* eslint-disable no-undef */
import { useState } from "react";
import { useLoaderData } from "react-router";
import { getStatus } from './api/free-gift-discount/status';
import { metadata } from "../extensions/free-gift";

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
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert("Local JS error: " + err.message);
    } finally {
      setCreating(false);
    }
  }


  const [settings, setSettings] = useState(() => {
    if (status?.metafield?.value) {
      return JSON.parse(status.metafield.value);
    }
    const initial = {};
    metadata.settings.forEach((s) => {
      initial[s.key] = s.default;
    });
    return initial;
  });

  const [isActive, setIsActive] = useState(
    status?.discount?.status === "ACTIVE"
  );
  
  const [loading, setLoading] = useState(false);

  const ACTIVATE_PATH = "/api/free-gift-discount/activate";

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


  function handleSettingChange(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  return (
<s-page
  heading={isEdit ? title : "Free Gift Discount"}
  backAction={{ content: "Discounts", url: "/app" }}
>
  <s-section heading={metadata.name}>
    <s-paragraph>{metadata.description}</s-paragraph>

    {!isEdit && (
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
          onClick={handleCreateDiscount}
          disabled={creating}
        >
          {creating
            ? isEdit ? "Saving..." : "Creating..."
            : isEdit ? "Save changes" : "Create Free Gift Discount"}
        </s-button>
        </div>
      </s-section>
    )}

    {isEdit && (
      <s-section heading="Actions">

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
      </s-section>
    )}
  </s-section>

  {hasDiscount && (
    <s-section heading="Discount Status">
      <p>
        Discount is <strong>{isActive ? "Active ✅" : "Inactive ❌"}</strong>
      </p>
      <p style={{ fontSize: "10px", color: "#666" }}>
        ID: {discountId}
      </p>
    </s-section>
  )}
</s-page>

  );
}