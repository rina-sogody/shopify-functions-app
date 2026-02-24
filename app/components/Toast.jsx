/* eslint-disable react/prop-types */
import { useEffect } from "react";

export default function Toast({ message, tone = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 6000); // stay longer
    return () => clearTimeout(t);
  }, [onClose]);

  if (!message) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        padding: "14px 18px",
        borderRadius: 14,
        fontWeight: 500,
        minWidth: 240,
        textAlign: "center",
        boxShadow: "0 10px 25px rgba(0,0,0,0.18)",
        background: tone === "success" ? "#16a34a" : "#dc2626",
        color: "#fff",
        animation: "toastSlideDown 0.35s ease",
      }}
    >
      {message}

      <style>
        {`
          @keyframes toastSlideDown {
            from { transform: translate(-50%, -25px); opacity: 0 }
            to { transform: translate(-50%, 0); opacity: 1 }
          }
        `}
      </style>
    </div>
  );
}