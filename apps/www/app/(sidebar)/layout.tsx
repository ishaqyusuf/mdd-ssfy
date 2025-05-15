import { getLoggedInProfile } from "@/actions/cache/get-loggedin-profile";
import { loadPageTabs } from "@/actions/cache/load-page-tabs";
import { getLinkModules, validateLinks } from "@/components/sidebar/links";
import { SideBar } from "@/components/sidebar/sidebar";

export default async function Layout({ children }) {
    const [user, pageTabs] = await Promise.all([
        getLoggedInProfile(),
        loadPageTabs(),
    ]);
    const validLinks = getLinkModules(
        validateLinks({
            role: user.role,
            can: user.can,
        }),
    );
    return (
        <SideBar validLinks={validLinks}>
            <div className="flex h-full w-full items-center justify-center">
                {children}
            </div>
        </SideBar>
    );
}
