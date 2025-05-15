"use client";

import { Separator } from "@gnd/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@gnd/ui/sidebar";
import { AppSideBar } from "./app-side-bar";
import { SidebarContext } from "./context";
import DevOnly from "@/_v2/components/common/dev-only";
import QuickLogin from "../quick-login";
import { SideMenu } from "./sidemenu";

export function SideBar({ children, validLinks }) {
    return (
        <SidebarProvider>
            <SidebarContext
                // args={[validLinks]}
                args={[validLinks]}
                // args={[data.user]}
            >
                {/* <AppSideBar /> */}
                <SideMenu />
                <SidebarInset>
                    <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                        <div className="flex items-center gap-2 px-4">
                            <SidebarTrigger className="-ml-1 size-4" />
                            <Separator
                                orientation="vertical"
                                className="mr-2 h-4"
                            />
                            <DevOnly>
                                <QuickLogin />
                            </DevOnly>
                            {/* <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem className="hidden md:block">
                                        <BreadcrumbLink href="#">
                                            Building Your Application
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator className="hidden md:block" />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage>
                                            Data Fetching
                                        </BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb> */}
                        </div>
                    </header>
                    {children}
                </SidebarInset>
            </SidebarContext>
        </SidebarProvider>
    );
}
