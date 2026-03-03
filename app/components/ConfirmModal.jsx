/* eslint-disable react/prop-types */
import { useEffect } from "react";

export default function ConfirmModal({
  open,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}) {

    useEffect(() => {
        const handler = (e) => e.key === "Escape" && onCancel?.();
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
      }, [onCancel]);
  if (!open) return null;

  const backdrop = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2147483647,
  };

  const modal = {
    background: "#fff",
    borderRadius: 14,
    padding: 24,
    width: 420,
    maxWidth: "92%",
    boxShadow: "0 18px 48px rgba(0,0,0,0.18)",
  };


  return (
    <div style={backdrop} >
      <div style={modal}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p>{message}</p>

        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <s-button tone="critical" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </s-button>
          <s-button onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </s-button>

        </div>
      </div>
    </div>
  );
}