import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { getStatus } from "./api/free-gift-by-variant/status";

export async function loader({ request }) {
  const url = new URL(request.url);
  const discountId = url.searchParams.get("discountId");

  let status = null;

  if (discountId) {
    try {
      status = await getStatus({ request, discountId });
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

export default function FreeGiftVariantPage() {
  const navigate = useNavigate();
  const loaderData = useLoaderData() || {};
  const { status, discountId, mode } = loaderData;
  const isEdit = mode === "edit";

  const [title, setTitle] = useState(status?.title || "");
  const [loading, setLoading] = useState(false);

  const [settings, setSettings] = useState(() => {
    if (status?.metafield?.value) {
      try {
        return JSON.parse(status.metafield.value);
      } catch {
        return {};
      }
    }
    return {};
  });

  const CREATE_PATH = "/api/free-gift-by-variant/create";
  const ACTIVATE_PATH = "/api/free-gift-by-variant/activate";
  const DELETE_PATH = "/api/free-gift-by-variant/delete";

  function validate() {
    if (!title.trim()) {
      alert("Discount name is required");
      return false;
    }

    if (!settings.triggerSku?.trim()) {
      alert("Trigger SKU is required");
      return false;
    }

    if (!settings.giftSku?.trim()) {
      alert("Gift SKU is required");
      return false;
    }

    return true;
  }

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

      if (data.success) navigate("/app");
      else alert("Error creating discount");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!validate()) return;

    setLoading(true);

    try {
      await fetch(ACTIVATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountId,
          settings,
          requestedStatus: status?.status || "ACTIVE",
        }),
      });
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
      heading="Free Gift (Trigger Variant)"
      backAction={{ content: "Discounts", url: "/app" }}
    >
      <s-section>

        {/* Title */}
        <div style={{ marginBottom: "1rem" }}>
          <label>
            Discount Name
            <input
              type="text"
              value={title}
              disabled={loading}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
        </div>

        {/* Trigger SKU */}
        <div style={{ marginBottom: "1rem" }}>
          <label>
            Trigger Variant SKU
            <input
              type="text"
              value={settings.triggerSku || ""}
              disabled={loading}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  triggerSku: e.target.value,
                })
              }
            />
          </label>
        </div>

        {/* Gift SKU */}
        <div style={{ marginBottom: "1rem" }}>
          <label>
            Gift Variant SKU
            <input
              type="text"
              value={settings.giftSku || ""}
              disabled={loading}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  giftSku: e.target.value,
                })
              }
            />
          </label>
        </div>

        {/* Actions */}
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
              Delete
            </s-button>
          </div>
        )}

      </s-section>
    </s-page>
  );
}
