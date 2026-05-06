"use client";

import { SiteNav } from "@gnd/site-nav";
import { NotificationCenter } from "./notification-center";
import { OpenSearchButton } from "./search/open-search-button";
import { UserNav } from "./user-nav";

export function Header() {
    return (
        <>
            <header
                className="fixed inset-x-0 top-0 z-50 flex h-[70px] items-center justify-between gap-4 border-b bg-background/90 px-4 shadow-sm backdrop-blur-xl backdrop-filter transition-transform md:relative md:m-0 md:border-b md:bg-background/70 md:px-6 md:shadow-none md:backdrop-blur-none md:backdrop-filter desktop:rounded-t-[10px]"
                style={{
                    transform:
                        "translateY(calc(var(--header-offset, 0px) * -1))",
                    transitionDuration: "var(--header-transition, 200ms)",
                    willChange: "transform",
                }}
            >
                <SiteNav.MobileSidebar />
                <div id="goBackSlot" />
                <div className="flex items-center space-x-4 lg:space-x-0">
                    <h1 className="font-bold" id="pageTitle"></h1>
                </div>
                <div
                    id="headerTitleSlot"
                    className="hidden md:flex items-center space-x-1"
                />
                <div
                    id="headerNav"
                    className="hidden md:flex items-center space-x-1"
                />
                <div
                    id="breadCrumb"
                    className="hidden md:flex items-center space-x-1"
                ></div>
                <OpenSearchButton />

                <div className="flex-1"></div>
                <div
                    className="hidden md:flex mx-4  gap-4 "
                    id="navRightSlot"
                ></div>
                <div
                    className="hidden md:inline-flex gap-4"
                    id="actionNav"
                ></div>
                <NotificationCenter />
                <UserNav />
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
                <div className="flex items-center space-x-4 lg:space-x-0">
                    <h1 className="font-bold" id="pageTitle"></h1>
                </div>
                <div
                    id="headerTitleSlot"
                    className="flex items-center space-x-1"
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
                <UserNav />
            </div>
            <div className="dark:bg-muted" id="pageTab"></div>
            <div className="overflow-auto" id="tab"></div>
        </header>
    );
}
