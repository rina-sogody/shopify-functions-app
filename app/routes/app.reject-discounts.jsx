import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { getStatus } from "./api/reject-discounts/status";
import Breadcrumbs from "../components/Breadcrumbs"

export async function loader({ request }) {
  const url = new URL(request.url);
  const discountId = url.searchParams.get("discountId");

  let status = null;

  if (discountId) {
    try {
      status = await getStatus({ request, discountId });
    } catch (err) {
      console.error("Loader error:", err);
    }
  }

  return {
    status,
    discountId,
    mode: discountId ? "edit" : "create",
  };
}

export default function RejectDiscountPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData();
  const isEdit = mode === "edit";

  const [title, setTitle] = useState(status?.title || "");
  const [loading, setLoading] = useState(false);

  const CREATE_PATH = "/api/reject-discounts/create";
  const ACTIVATE_PATH = "/api/reject-discounts/activate";
  const DELETE_PATH = "/api/reject-discounts/delete";

  async function handleCreate() {
    if (!title.trim()) return alert("Campaign name required");

    setLoading(true);

    try {
      const res = await fetch(CREATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, settings: {} }),
      });

      const data = await res.json();
      if (data.success) navigate("/app");
      else alert("Error creating campaign");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setLoading(true);

    try {
      await fetch(ACTIVATE_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountId,
          settings: {},
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
      heading="Reject Discount Codes Campaign"
      backAction={{ content: "Discounts", url: "/app" }}
    >
      <Breadcrumbs/>
      <s-section>

        <div style={{ marginBottom: "1rem" }}>
          <label>
            Campaign Name:
            <input
              type="text"
              value={title}
              disabled={loading}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
        </div>

        <s-paragraph>
          When active, this campaign rejects all discount codes entered at checkout.
        </s-paragraph>

        <div style={{ marginTop: "1.5rem" }}>
          <s-button
            onClick={isEdit ? handleSave : handleCreate}
            disabled={loading}
          >
            {loading
              ? "Processing..."
              : isEdit
              ? "Save Changes"
              : "Create"}
          </s-button>
        </div>

        {isEdit && (
          <div style={{ marginTop: "1rem" }}>
            <s-button tone="critical" onClick={handleDelete} disabled={loading}>
              Delete
            </s-button>
          </div>
        )}

      </s-section>
    </s-page>
  );
}