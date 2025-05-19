"use client";

import { SidebarInset, SidebarProvider } from "@gnd/ui/sidebar";
import { SidebarContext } from "./context";

import { SideMenu } from "./sidemenu";
import { Header } from "./header";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";

export function SideBar({ children, validLinks }) {
    const { data: session } = useSession({
        required: true,
        onUnauthenticated() {
            redirect("/login");
        },
    });
    if (!session?.user) return <></>;
    return (
        <SidebarProvider>
            <SidebarContext args={[validLinks]}>
                <SideMenu />
                <SidebarInset>
                    <Header />
                    <div className="flex flex-col flex-1 min-h-screen">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarContext>
        </SidebarProvider>
    );
}
