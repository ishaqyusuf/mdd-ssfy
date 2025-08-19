"use client";

import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider } from "@/hooks/use-sidebar";

export function SidebarContent({ children }) {
    const auth = useAuth();
    if (!auth.id) return null;
    return <SidebarProvider>{children}</SidebarProvider>;
}

