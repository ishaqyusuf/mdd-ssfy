import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { loadPageTabs } from "@/actions/cache/load-page-tabs";
import { getSideMenuMode } from "@/actions/cookies/sidemenu";
import { GlobalModals } from "@/components/modals/global-modals";
import { GlobalSheets } from "@/components/sheets/global-sheets";
import { getLinkModules, validateLinks } from "@/components/sidebar/links";
import { SideBar } from "@/components/sidebar/sidebar";

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
            <GlobalSheets />
            <GlobalModals />
        </SideBar>
    );
}
