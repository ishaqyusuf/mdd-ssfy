"use client";

import { useAuth } from "@/hooks/use-auth";

export function SidebarContent({ children }) {
    const auth = useAuth();
    if (!auth.id) return null;
    return <>{children}</>;
}

