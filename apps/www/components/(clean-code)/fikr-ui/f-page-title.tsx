"use client";

import { createPortal } from "react-dom";

export default function FTitle({ children }) {
    const Element = document?.getElementById("pageTitle");
    if (!Element) return;
    return createPortal(
        <div className="text-lg capitalize xl:text-xl font-medium">
            {children}
        </div>,
        Element,
    ) as any;
}
