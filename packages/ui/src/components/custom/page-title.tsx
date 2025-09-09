"use client";

import { createPortal } from "react-dom";
import { useAsyncMemo } from "use-async-memo";

export function PageTitle({ children }) {
  const Element = useAsyncMemo(async () => {
    // if (!noDelay) await timeout(1500);
    return document.getElementById("pageTitle");
  }, [children]);
  if (!Element) return null;
  return createPortal(
    <div className="text-lg capitalize xl:text-xl font-medium">{children}</div>,
    Element
  ) as any;
}
