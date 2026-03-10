/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";

export default function SButton({ onClick, children, ...props }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onClick) return;

    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [onClick]);

  return (
    <s-button ref={ref} {...props}>
      {children}
    </s-button>
  );
}