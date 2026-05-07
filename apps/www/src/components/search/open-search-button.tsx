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
                className="no-drag relative flex size-10 shrink-0 justify-center rounded-full border-border/70 bg-background/80 p-0 text-xs font-normal text-muted-foreground shadow-sm hover:bg-accent/60 sm:h-auto sm:size-auto sm:min-w-[250px] sm:flex-1 sm:justify-start sm:rounded-md sm:border-0 sm:bg-transparent sm:p-0 sm:pr-12 sm:text-sm sm:shadow-none sm:hover:bg-transparent md:w-40 md:flex-none lg:w-64"
                onClick={() => setOpen()}
            >
                <Icons.Search size={18} className="shrink-0 sm:mr-2" />
                <span className="hidden truncate sm:inline">Find anything...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 border bg-accent px-1.5 font-mono text-[10px] font-medium opacity-0 hover:opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
        </SuperAdminGuard>
    );
}
