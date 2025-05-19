"use client";

import { SidebarInset, SidebarProvider } from "@gnd/ui/sidebar";
import { SidebarContext } from "./context";

import { SideMenu } from "./sidemenu";
import { Header } from "./header";

export function SideBar({ children, validLinks }) {
    return (
        <SidebarProvider>
            <SidebarContext args={[validLinks]}>
                <SideMenu />
                <SidebarInset>
                    <Header />
                    <div className="flex flex-col min-h-screen">{children}</div>
                </SidebarInset>
            </SidebarContext>
        </SidebarProvider>
    );
}
