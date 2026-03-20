import { MobileSidebar } from "./components/mobile-sidebar";
import { NavsList } from "./components/navs-list";
import { Sidebar } from "./components/sidebar";
import { Logo, LogoSm } from "./components/logo";
import { User } from "./components/user";
import { Header } from "./components/header";

import { SidebarShell } from "./components/sidebar-shell";
import { SiteNavContext } from "./components/use-site-nav";

export * from "./components/use-site-nav";
export { NavLink } from "./components/nav-link";
export { NavItem } from "./components/nav-item";
export { NavChildItem } from "./components/nav-child-item";
export { Header } from "./components/header";
export type { HeaderProps } from "./components/header";
export const SiteNav = Object.assign(
  {},
  {
    Provider: SiteNavContext.Provider,
    NavsList,
    Sidebar,
    Logo,
    LogoSm,
    User,
    MobileSidebar: MobileSidebar,
    Shell: SidebarShell,
    Header,
  }
);
