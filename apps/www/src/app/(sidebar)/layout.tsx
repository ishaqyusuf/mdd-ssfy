import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { loadPageTabs } from "@/actions/cache/load-page-tabs";
import { getSideMenuMode } from "@/actions/cookies/sidemenu";
import { Header } from "@/components/header";
import { GlobalModals } from "@/components/modals/global-modals";
import { GlobalSheets } from "@/components/sheets/global-sheets";
import { SidebarContent } from "@/components/sidebar-content";
import { getLinkModules, validateLinks } from "@/components/sidebar/links";
import { SideBar as OldSideBar } from "@/components/sidebar/sidebar";
import { TaskNotification } from "@/components/task-notification";
import { HydrateClient } from "@/trpc/server";
import { env } from "process";
import { Suspense } from "react";

// export default
export default async function Layout({ children }) {
    // return <>{children}</>;
    return (
        <HydrateClient>
            <div className="relative">
                <SidebarContent>
                    {children}
                    {/* <Sidebar />

                    <div className="md:ml-[70px] pb-8">
                        <Header />
                        <div className="px-6">{children}</div>
                    </div> */}
                </SidebarContent>

                <Suspense>
                    <GlobalSheets />
                    <GlobalModals />
                    <TaskNotification />
                </Suspense>

                {/* <GlobalTimerProvider />
                <TimezoneDetector /> */}
            </div>
        </HydrateClient>
    );
}
