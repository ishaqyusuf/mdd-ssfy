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

    if (!session?.user) return <></>;
    return (
        <SidebarProviderRoot state={menuMode}>
            <SidebarContext args={[validLinks, user]}>
                <SideMenu />
                <SidebarInset className="flex-1 space-y-4 overflow-hidden pb-8">
                    <Header />
                    <div className="sm:px-6">{children}</div>
                </SidebarInset>
                {/* </div> */}
            </SidebarContext>
        </SidebarProviderRoot>
    );
}
