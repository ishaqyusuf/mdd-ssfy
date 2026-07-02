"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTestEmailMode } from "@/store/test-email-mode";
import { SiteNav, useSiteNav } from "@gnd/site-nav";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import type { CSSProperties } from "react";
import { NotificationCenter } from "./notification-center";
import { OpenSearchButton } from "./search/open-search-button";
import { SalesRepRequestBadge } from "./sales-rep-request-badge";
import { UserNav } from "./user-nav";

function TestEmailModeButton() {
    const auth = useAuth();
    const testEmailMode = useTestEmailMode((state) => state.enabled);
    const toggleTestEmailMode = useTestEmailMode((state) => state.toggle);
    const isSuperAdmin = auth.roleTitle?.toLowerCase() === "super admin";

    if (!isSuperAdmin) return null;

    return (
        <Button
            type="button"
            variant={testEmailMode ? "destructive" : "secondary"}
            size="icon"
            className="h-8 w-8 rounded-full"
            aria-label="Toggle test email mode"
            aria-pressed={testEmailMode}
            title="Toggle test email mode"
            onClick={toggleTestEmailMode}
        >
            <Icons.Mail className="size-4" />
        </Button>
    );
}

export function Header() {
    const {
        isExpanded,
        linkModules,
        handleNavMouseEnter,
        handleNavMouseLeave,
    } = useSiteNav();
    const sidebarHeaderOffset =
        isExpanded && !linkModules?.noSidebar ? "184px" : "0px";

    return (
        <>
            <header
                data-site-nav-hover-surface="true"
                onMouseEnter={handleNavMouseEnter}
                onMouseLeave={handleNavMouseLeave}
                className="fixed inset-x-0 top-0 z-50 flex h-[70px] items-center justify-between gap-4 border-b bg-background/90 px-4 shadow-sm backdrop-blur-xl backdrop-filter transition-[padding-left,transform] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none md:relative md:m-0 md:border-b md:bg-background/70 md:pl-[calc(1.5rem+var(--site-nav-header-offset))] md:pr-6 md:shadow-none md:backdrop-blur-none md:backdrop-filter desktop:rounded-t-[10px]"
                style={{
                    "--site-nav-header-offset": sidebarHeaderOffset,
                    transform:
                        "translateY(calc(var(--header-offset, 0px) * -1))",
                    transitionDuration: "var(--header-transition, 300ms)",
                    transitionTimingFunction: "cubic-bezier(0.4,0,0.2,1)",
                    willChange: "transform, padding-left",
                } as CSSProperties}
            >
                <SiteNav.MobileSidebar />
                <div id="goBackSlot" />
                <div className="flex min-w-0 items-center space-x-4 whitespace-nowrap lg:space-x-0">
                    <h1 className="font-bold whitespace-nowrap" id="pageTitle"></h1>
                </div>
                <div
                    id="headerTitleSlot"
                    className="hidden md:flex items-center space-x-1 whitespace-nowrap"
                />
                <div
                    id="headerNav"
                    className="hidden md:flex items-center space-x-1"
                />
                <div
                    id="breadCrumb"
                    className="hidden md:flex items-center space-x-1"
                ></div>
                <div className="hidden sm:contents">
                    <OpenSearchButton />
                </div>

                <div className="flex-1"></div>
                <div
                    className="hidden md:flex mx-4  gap-4 "
                    id="navRightSlot"
                ></div>
                <div
                    className="hidden md:inline-flex gap-4"
                    id="actionNav"
                ></div>
                <div className="contents sm:hidden">
                    <OpenSearchButton />
                </div>
                <SalesRepRequestBadge />
                <TestEmailModeButton />
                <NotificationCenter />
                <UserNav links={linkModules} />
            </header>
            <div className="h-[70px] md:hidden" />
            <div className="dark:bg-muted" id="pageTab"></div>
            <div className="overflow-auto" id="tab"></div>
        </>
    );
    return (
        <header className="md:border-b">
            <div className="md:m-0 z-50 px-6 border-b  h-(--header-height) flex gap-4 items-center desktop:sticky desktop:top-0 desktop:bg-background sticky md:statics top-0 backdrop-filter backdrop-blur-xl md:backdrop-filter md:backdrop-blur-none dark:bg-[#121212] bg-[#fff] bg-opacity-70 desktop:rounded-t-[10px]">
                <SiteNav.MobileSidebar />
                <div id="goBackSlot" />
                <div className="flex min-w-0 items-center space-x-4 whitespace-nowrap lg:space-x-0">
                    <h1 className="font-bold whitespace-nowrap" id="pageTitle"></h1>
                </div>
                <div
                    id="headerTitleSlot"
                    className="flex items-center space-x-1 whitespace-nowrap"
                />
                <div id="headerNav" className="flex items-center space-x-1" />
                <div
                    id="breadCrumb"
                    className="flex items-center space-x-1"
                ></div>
                <OpenSearchButton />

                <div className="flex-1"></div>
                <div className="mx-4 flex gap-4 " id="navRightSlot"></div>
                <div className="inline-flex gap-4" id="actionNav"></div>
                <NotificationCenter />
                <UserNav links={linkModules} />
            </div>
            <div className="dark:bg-muted" id="pageTab"></div>
            <div className="overflow-auto" id="tab"></div>
        </header>
    );
}
