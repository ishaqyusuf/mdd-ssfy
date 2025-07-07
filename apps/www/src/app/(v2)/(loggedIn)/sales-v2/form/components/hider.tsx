"use client";

import { useDykeCtx } from "../_hooks/form-context";

interface Props {
    children?;
    hide: "admin" | "dealer";
}
export default function Hider({ children, hide }: Props) {
    const ctx = useDykeCtx();
    if (ctx.dealerMode && hide != "dealer") return children;
    if (!ctx.dealerMode && hide != "admin") return children;
    return null;
}
