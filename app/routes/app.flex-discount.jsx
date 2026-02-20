import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { getStatus } from "./api/flex-discount/status";
import { metadata } from "../extensions/flex-discount"; 
import Breadcrumbs from "../components/Breadcrumbs"

export async function loader({ request }) {
  const url = new URL(request.url);
  const discountId = url.searchParams.get("discountId");

  const status = await getStatus({ request, discountId });

  return {
    status,
    discountId,
    mode: discountId ? "edit" : "create",
  };
}

export default function FlexDiscountPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData();
  const isEdit = mode === "edit";

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
  

  const CREATE_PATH = "/api/flex-discount/create";
  const ACTIVATE_PATH = "/api/flex-discount/activate";
  const DELETE_PATH = "/api/flex-discount/delete";

  function validate() {
    if (!title.trim()) {
      alert("Discount name is required.");
      return false;
    }

    if (!settings.tiers.length) {
      alert("At least one tier is required.");
      return false;
    }

    for (const tier of settings.tiers) {
      if (tier.threshold <= 0) {
        alert("Threshold must be greater than 0.");
        return false;
      }
      if (tier.percent <= 0 || tier.percent > 100) {
        alert("Discount percent must be between 1 and 100.");
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

      if (data.success) {
        navigate("/app");
      } else {
        console.error("Create error:", data);
        alert(JSON.stringify(data, null, 2));
      }
      
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
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
      if (!data.success) alert("Error saving");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setLoading(true);

    try {
      await fetch(DELETE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discountId }),
      });

      navigate("/app");
    } finally {
      setLoading(false);
    }
  }

  return (
    <s-page
      backAction={{ content: "Discounts", url: "/app" }}
    >
      <Breadcrumbs/>
      <s-section>
      <h2 style={{ fontSize: "17px", marginTop: "0", marginBottom: "0"}}>{metadata.name}</h2>
      <p style={{ fontSize: "15px" }}>{metadata.description}</p>

        <div style={{ marginBottom: "1rem" }}>
          <label>
            Discount Name: 
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
            />
          </label>
        </div>
        

        <s-section heading="Discount Tiers">
          {settings.tiers.map((tier, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "1rem",
                alignItems: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <label>
                Spend (€)
                <input
                  type="number"
                  min="0"
                  value={tier.threshold / 100}
                  disabled={loading}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value || 0);
                    const updated = [...settings.tiers];
                    updated[index].threshold = Math.round(value * 100);
                    setSettings({ tiers: updated });
                  }}
                />
              </label>

              <label>
                Discount (%)
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={tier.percent}
                  disabled={loading}
                  onChange={(e) => {
                    const updated = [...settings.tiers];
                    updated[index].percent =
                      parseInt(e.target.value || 0, 10);
                    setSettings({ tiers: updated });
                  }}
                />
              </label>

              <label>
                Message
                <input
                  type="text"
                  value={tier.message}
                  disabled={loading}
                  onChange={(e) => {
                    const updated = [...settings.tiers];
                    updated[index].message = e.target.value;
                    setSettings({ tiers: updated });
                  }}
                />
              </label>

              <s-button
                tone="critical"
                disabled={loading}
                onClick={() => {
                  const updated = settings.tiers.filter(
                    (_, i) => i !== index
                  );
                  setSettings({ tiers: updated });
                }}
              >
                Remove
              </s-button>
            </div>
          ))}

          <s-button
            variant="secondary"
            disabled={loading}
            onClick={() => {
              setSettings({
                tiers: [
                  ...settings.tiers,
                  { threshold: 0, percent: 10, message: "" },
                ],
              });
            }}
          >
            + Add Tier
          </s-button>
        </s-section>

        <s-section heading="Eligible Products (SKUs)">

          {settings.eligibleSkus?.map((sku, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                gap: "1rem",
                marginBottom: "1rem",
                alignItems: "center",
              }}
            >
              <label>
                SKU
                <input
                  type="text"
                  value={sku}
                  disabled={loading}
                  onChange={(e) => {
                    const updated = [...settings.eligibleSkus];
                    updated[index] = e.target.value;
                    setSettings({ ...settings, eligibleSkus: updated });
                  }}
                />
              </label>

              <s-button
                tone="critical"
                disabled={loading}
                onClick={() => {
                  const updated = settings.eligibleSkus.filter((_, i) => i !== index);
                  setSettings({ ...settings, eligibleSkus: updated });
                }}
              >
                Remove
              </s-button>
            </div>
          ))}

          <s-button
            variant="secondary"
            disabled={loading}
            onClick={() => {
              setSettings({
                ...settings,
                eligibleSkus: [...(settings.eligibleSkus || []), ""],
              });
            }}
          >
            + Add SKU
          </s-button>

        </s-section>

        <div style={{ marginTop: "1.5rem" }}>
          <s-button
            onClick={isEdit ? handleSave : handleCreate}
            disabled={loading}
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
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Processing..." : "Delete"}
            </s-button>
          </div>
        )}
      </s-section>
    </s-page>
  );
}
