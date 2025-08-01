import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { loadPageTabs } from "@/actions/cache/load-page-tabs";
import { getSideMenuMode } from "@/actions/cookies/sidemenu";
import { Header } from "@/components/header";
import { GlobalModals } from "@/components/modals/global-modals";
import { GlobalSheets } from "@/components/sheets/global-sheets";
import { Sidebar } from "@/components/sidebar";
import { getLinkModules, validateLinks } from "@/components/sidebar/links";
import { SideBar } from "@/components/sidebar/sidebar";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";

// export default
async function Layout({ children }) {
    return (
        <HydrateClient>
            <div className="relative">
                <Sidebar />

                <div className="md:ml-[70px] pb-8">
                    <Header />
                    <div className="px-6">{children}</div>
                </div>
                {/* <ExportStatus /> */}
                <Suspense>
                    <GlobalSheets />
                    <GlobalModals />
                </Suspense>

                {/* <GlobalTimerProvider />
                <TimezoneDetector /> */}
            </div>
        </HydrateClient>
    );
}
export default async function SideBarLayout({ children }) {
    const [user, pageTabs] = await Promise.all([
        getLoggedInProfile(),
        loadPageTabs(),
    ]);
    const validLinks = getLinkModules(
        validateLinks({
            role: user.role,
            can: user.can,
            userId: user?.userId,
        }),
    );
    const menuMode = await getSideMenuMode();
    return (
        <SideBar user={user} menuMode={menuMode} validLinks={validLinks}>
            {children}
            <Suspense>
                <GlobalSheets />
                <GlobalModals />
            </Suspense>
        </SideBar>
    );
}
