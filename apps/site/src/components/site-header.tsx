import Link from "next/link";

import { siteConfig } from "@/config/site";
import { cn } from "@gnd/ui/cn";
import { Button, buttonVariants } from "@gnd/ui/button";
import { MainNav } from "@/components/main-nav";
import { MobileNav } from "@/components/mobile-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <MainNav items={siteConfig.mainNav} />
        <MobileNav items={siteConfig.mainNav} />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <Button size="sm">
              My Account
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
}