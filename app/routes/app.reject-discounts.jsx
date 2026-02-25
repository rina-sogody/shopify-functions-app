import { useState } from "react";
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
        type: "reject",
      });
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

const CREATE_PATH = "/api/reject-discounts/create";
const ACTIVATE_PATH = "/api/reject-discounts/activate";
const DELETE_PATH = "/api/reject-discounts/delete";

export default function RejectDiscountPage() {
  const navigate = useNavigate();
  const { status, discountId, mode } = useLoaderData();

  const isEdit = mode === "edit";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [title, setTitle] = useState(status?.title || "");

  const toastError = (message) => setToast({ message, tone: "error" });
  const toastSuccess = (message) => setToast({ message, tone: "success" });

  function validate() {
    if (!title?.trim()) {
      toastError("Campaign name required");
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
        body: JSON.stringify({ title, settings: {} }),
      });

      const data = await res.json();

      if (!data.success) {
        toastError(data.error || "Error creating campaign");
        return;
      }

      toastSuccess("Campaign created successfully!");
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
          settings: {},
          requestedStatus: status?.status || "ACTIVE",
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toastError("Error deleting discount");
        return;
      }

      toastSuccess("Saved!");
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
        <s-stack gap="200">
          <div style={{ marginBottom: "10px "}}>

          <s-heading variant="headingMd">Reject discount</s-heading>
          </div>

          <s-text-field
            label="Reject discount name"
            value={title.toString()}
            disabled={loading}
            onInput={(e) => setTitle(e.target.value)}
          />

          <div style={{ margin: "10px 0"}}>
            <s-text tone="subdued">
              When active, all codes entered at checkout will be rejected.
            </s-text>
          </div>

          <div style={{ marginBottom: "10px"}}>
            <s-button
              onClick={isEdit ? handleSave : handleCreate}
              disabled={loading}
            >
              {loading ? "Processing..." : isEdit ? "Save changes" : "Create"}
            </s-button>
          </div>

          {isEdit && (
            <s-button
              tone="critical"
              onClick={() => setConfirmOpen(true)}
              disabled={loading}
            >
              Delete
            </s-button>
          )}
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