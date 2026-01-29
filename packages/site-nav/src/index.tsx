import { MobileSidebar } from "./components/mobile-sidebar";
import { NavsList } from "./components/navs-list";
import { Sidebar } from "./components/sidebar";

import { SidebarShell } from "./components/sidebar-shell";
import { SiteNavContext } from "./components/use-site-nav";

export * from "./components/use-site-nav";
export const SiteNav = Object.assign(
  {},
  {
    Provider: SiteNavContext.Provider,
    NavsList,
    Sidebar,
    MobileSidebar: MobileSidebar,
    Shell: SidebarShell,
  }
);
