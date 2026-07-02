import { cn } from "@gnd/ui/cn";
import { MobileSidebar } from "./mobile-sidebar";
import type { ReactNode } from "react";
import { useSiteNav } from "./use-site-nav";

export interface HeaderProps {
  className?: string;
  children?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  mobileMenu?: boolean;
}

export function Header({
  className,
  children,
  left,
  right,
  mobileMenu = true,
}: HeaderProps) {
  const { handleNavMouseEnter, handleNavMouseLeave } = useSiteNav();

  return (
    <>
      <header
        data-site-nav-hover-surface="true"
        onMouseEnter={handleNavMouseEnter}
        onMouseLeave={handleNavMouseLeave}
        className={cn(
          "z-50 px-6 md:border-b h-[70px] flex justify-between items-center top-0 backdrop-filter backdrop-blur-xl md:backdrop-filter md:backdrop-blur-none bg-background bg-opacity-70 desktop:rounded-t-[10px] transition-transform gap-4",
          className,
        )}
        style={{
          transform: "translateY(calc(var(--header-offset, 0px) * -1))",
          transitionDuration: "var(--header-transition, 200ms)",
          willChange: "transform",
        }}
      >
        {mobileMenu && (
          <div className="md:hidden">
            <MobileSidebar />
          </div>
        )}
        {left}
        <div className="flex-1">{children}</div>
        {right}
      </header>
    </>
  );
}
