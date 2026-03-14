import { cn } from "@gnd/ui/cn";
import { useSiteNav } from "./use-site-nav";

export function SidebarShell({ children, className = "" }) {
  const sb = useSiteNav();
  const hasSidebar = !sb.linkModules?.noSidebar;
  return (
    <div className={cn(className, hasSidebar && "md:ml-[70px]")}>
      {children}
    </div>
  );
}
