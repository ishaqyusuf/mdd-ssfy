"use client";

import { useSearchStore } from "@/store/search";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { SuperAdminGuard } from "../auth-guard";

export function OpenSearchButton() {
    const { setOpen } = useSearchStore();

    return (
        <SuperAdminGuard>
            <Button
                variant="outline"
                aria-label="Search"
                className="no-drag relative flex size-10 shrink-0 justify-center rounded-full border-border/70 bg-background/80 p-0 text-xs font-normal text-muted-foreground shadow-sm hover:bg-accent/60 xl:h-auto xl:size-auto xl:min-w-[250px] xl:flex-1 xl:justify-start xl:rounded-md xl:border-0 xl:bg-transparent xl:p-0 xl:pr-12 xl:text-sm xl:shadow-none xl:hover:bg-transparent"
                onClick={() => setOpen()}
            >
                <Icons.Search size={18} className="shrink-0 xl:mr-2" />
                <span className="hidden truncate xl:inline">Find anything...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 border bg-accent px-1.5 font-mono text-[10px] font-medium opacity-0 hover:opacity-100 xl:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
        </SuperAdminGuard>
    );
}
