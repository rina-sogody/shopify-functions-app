import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { getStatus } from "./api/reject-discounts/status";
import Breadcrumbs from "../components/Breadcrumbs"
import ConfirmModal from "../components/ConfirmModal";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
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
        alert("Error deleting discount");
        return;
      }
  
      navigate("/app");
    } catch (err) {
      alert(err.message);
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
      <h2 style={{ fontSize: "17px", marginTop: "0", marginBottom: "14px"}}>Reject Discount</h2>
        <div style={{ marginBottom: "1rem" }}>
          <label>
            Reject Discount Name: {" "} 
            <input
              type="text"
              value={title}
              disabled={loading}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
        </div>

        <s-paragraph>
          When active, all codes entered at checkout will be rejected.
        </s-paragraph>

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
              : "Create"}
          </s-button>
        </div>

        {isEdit && (
          <div style={{ marginTop: "1rem" }}>
            <s-button tone="critical"
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
    </s-page>
  );
}