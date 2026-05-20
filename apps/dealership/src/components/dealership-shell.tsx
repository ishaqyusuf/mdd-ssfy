"use client";

import { authClient } from "@/lib/auth-client";
import { SiteNav, createSiteNavContext } from "@gnd/site-nav";
import {
  createNavLink,
  createNavModule,
  createNavSection,
} from "@gnd/site-nav/types";
import type { IconKeys } from "@gnd/ui/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeToggle } from "./theme-toggle";

const dealershipLinks = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/orders", label: "Orders", icon: "orders" },
  { href: "/quotes", label: "Quotes", icon: "quotes" },
  { href: "/customers", label: "Customers", icon: "customers" },
  { href: "/profiles", label: "Sales Profiles", icon: "dealer" },
  { href: "/settings", label: "Company Settings", icon: "settings" },
];

const dealershipNavModules = [
  createNavModule("", "dealer", "Dealer workspace", [
    createNavSection(
      "Workspace",
      "Workspace",
      dealershipLinks.map((item) =>
        createNavLink(item.label, item.icon as IconKeys, item.href).data,
      ),
    ),
  ]),
];

type DealerShellDealer = {
  name: string | null;
  companyName: string | null;
  email: string;
  dealer: {
    name: string | null;
    businessName: string | null;
  } | null;
};

export function DealershipShell({
  children,
  dealer,
}: {
  children: ReactNode;
  dealer: DealerShellDealer;
}) {
  const displayName =
    dealer.companyName ||
    dealer.dealer?.businessName ||
    dealer.name ||
    dealer.dealer?.name ||
    dealer.email;
  const pathname = usePathname();
  const siteNav = createSiteNavContext({
    pathName: pathname,
    linkModules: dealershipNavModules,
    accessMode: "open",
    LogoIcon: DealerLogoMark,
    LogoSmIcon: DealerLogoMark,
    Link,
  });

  const handleLogout = async () => {
    await authClient.signOut();
    window.location.href = "/login";
  };

  return (
    <SiteNav.Provider value={siteNav}>
      <div className="relative min-h-screen bg-background text-foreground">
        <SiteNav.Sidebar>
          <SiteNav.Logo Icon={DealerLogoMark} />
          <SiteNav.LogoSm Icon={DealerLogoMark} />
          <div className="absolute bottom-5 left-0 right-0 z-10 flex w-full items-center justify-center px-3 md:justify-start">
            <SiteNav.User
              user={{
                name: displayName,
                email: dealer.email,
              }}
              onLogout={handleLogout}
            />
          </div>
        </SiteNav.Sidebar>

        <SiteNav.Shell className="pb-8">
          <SiteNav.Header
            left={
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Dealer workspace
                </p>
                <p className="truncate text-sm font-semibold md:text-base">
                  {displayName}
                </p>
              </div>
            }
            right={<ThemeToggle />}
          />
          <main className="flex min-h-[calc(100vh-70px)] w-full flex-col">
            {children}
          </main>
        </SiteNav.Shell>
      </div>
    </SiteNav.Provider>
  );
}

function DealerLogoMark() {
  return (
    <img
      alt=""
      className="h-10 w-10 rounded-lg object-contain"
      src="/dealership-logo.svg"
    />
  );
}
