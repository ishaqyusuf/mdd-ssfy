import { Env } from "@/components/env";
import { Separator } from "@gnd/ui/separator";
import { SidebarTrigger } from "@gnd/ui/sidebar";
import { useSidebar, useSidebarState } from "./context";
import { cn } from "@gnd/ui/cn";
import { ModeToggle } from "./mode-toggle";
import { UserNav } from "./user-nav";
import { OpenSearchButton } from "../search/open-search-button";

export function Header({}) {
    const ctx = useSidebar();
    const { setDefaultOpen, defaultOpen } = useSidebarState();
    return (
        <>
            <header className="z-10 bg-background/95  dark:bg-inherit sticky top-0  sshadow backdrop-blur supports-[backdrop-filter]:bg-background/60 dark:shadow-secondary w-full border-b">
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
                    <div
                        id="headerTitleSlot"
                        className="flex items-center space-x-1"
                    />
                    <div
                        id="headerNav"
                        className="flex items-center space-x-1"
                    />
                    <div
                        id="breadCrumb"
                        className="flex items-center space-x-1"
                    ></div>

                    <OpenSearchButton />
                    <div className="flex-1"></div>
                    <div className="mx-4 flex gap-4 " id="navRightSlot"></div>
                    <div className="inline-flex gap-4" id="actionNav"></div>
                    <ModeToggle />
                    <UserNav />
                </div>
                <div className="bg-white" id="pageTab"></div>
                <div className="overflow-auto" id="tab"></div>
            </header>
        </>
    );
}
