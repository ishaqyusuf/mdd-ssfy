"use client";

import { SidebarInset, SidebarProvider } from "@gnd/ui/sidebar";
import { SidebarContext, SidebarProviderRoot } from "./context";

import { SideMenu } from "./sidemenu";
import { Header } from "./header";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export function SideBar({ children, user, menuMode, validLinks }) {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    // adasd
    if (!session?.user) return <></>;
    return (
        <SidebarProviderRoot state={menuMode}>
            <SidebarContext args={[validLinks, user]}>
                <SideMenu />
                <SidebarInset className="flex-1 space-y-4 overflow-hidden">
                    <Header />
                    {children}
                </SidebarInset>
            </SidebarContext>
        </SidebarProviderRoot>
    );
}
