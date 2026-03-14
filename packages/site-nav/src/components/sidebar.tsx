import { cn } from "@gnd/ui/cn";
import { useSiteNav } from "./use-site-nav";
import { NavsList } from "./navs-list";

interface Props {}

export function Sidebar({ children }: { children?: React.ReactNode }) {
  const ctx = useSiteNav();
  const { isExpanded, mainMenuRef, setIsExpanded, linkModules } = ctx;
  if (linkModules?.noSidebar) return null;
  return (
    <aside
      className={cn(
        "relative h-screen flex-shrink-0 flex-col desktop:overflow-hidden desktop:rounded-tl-[10px] desktop:rounded-bl-[10px] justify-between fixed top-0 pb-4 items-center hidden md:flex z-50 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",

        " border-r border-border",
        isExpanded ? "w-[240px]" : "w-[70px]",
        "bg-background bg-secondary",
      )}
    >
      <div
        ref={mainMenuRef}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto scrollbar-hide w-full pb-[100px] pt-[75px]"
      >
        <NavsList />
      </div>
      {children}
    </aside>
  );
}
