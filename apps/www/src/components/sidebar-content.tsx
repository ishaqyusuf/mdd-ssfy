"use client";

import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, useLinks } from "@/hooks/use-sidebar";
import { Sidebar } from "./sidebar";
import { cn } from "@gnd/ui/cn";
import { Header } from "./header";

export function SidebarContent({ children }) {
    const auth = useAuth();
    if (!auth.id) return null;
    return (
        <SidebarProvider args={[{}]}>
            <Sidebar />
            <Content>{children}</Content>
        </SidebarProvider>
    );
}

function Content({ children }) {
    const links = useLinks();
    return (
        <div className={cn("pb-8", links?.noSidebar || "md:ml-[70px]")}>
            <Header />
            <div className="px-6">{children}</div>
        </div>
    );
}
