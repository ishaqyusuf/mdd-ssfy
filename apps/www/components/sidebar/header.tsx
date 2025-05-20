import DevOnly from "@/_v2/components/common/dev-only";
import { Separator } from "@gnd/ui/separator";
import { SidebarTrigger } from "@gnd/ui/sidebar";
import QuickLogin from "../quick-login";
import { useSidebar, useSidebarState } from "./context";
import { cn } from "@gnd/ui/cn";
import { ModeToggle } from "./mode-toggle";
import { UserNav } from "./user-nav";

export function Header({}) {
    const ctx = useSidebar();
    const { setDefaultOpen, defaultOpen } = useSidebarState();
    return (
        <>
            <header className="z-10 bg-background/95  dark:bg-inherit sticky top-0 sborder-b sshadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary w-full">
                <div className="flex h-16 shrink-0 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12  items-center gap-2 px-4">
                    <div
                        className={cn(
                            "flex items-center gap-2",
                            // ctx.renderMode == "none" && "hidden",
                        )}
                    >
                        <SidebarTrigger
                            onClick={(e) => {
                                setDefaultOpen(!defaultOpen);
                            }}
                            className="-ml-1 size-4"
                        />
                        <Separator
                            orientation="vertical"
                            className="mr-2 h-4"
                        />
                    </div>
                    <div className="flex items-center space-x-4 lg:space-x-0">
                        <h1 className="font-bold" id="pageTitle"></h1>
                    </div>
                    <DevOnly>
                        <QuickLogin />
                    </DevOnly>
                    <div className="flex-1"></div>
                    <div className="mx-4 flex gap-4 " id="navRightSlot"></div>
                    <ModeToggle />
                    <UserNav />
                </div>
            </header>
            <div className="bg-white" id="pageTab"></div>
        </>
    );
}
