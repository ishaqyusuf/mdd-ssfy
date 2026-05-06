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
                aria-label="Find anything"
                className="no-drag relative flex h-10 min-w-0 max-w-[160px] flex-1 shrink justify-start rounded-full border-border/70 bg-background/80 px-3 text-xs font-normal text-muted-foreground shadow-sm hover:bg-accent/60 sm:max-w-[220px] md:h-auto md:min-w-[250px] md:flex-none md:rounded-md md:border-0 md:bg-transparent md:p-0 md:pr-12 md:text-sm md:shadow-none md:hover:bg-transparent lg:w-64"
                onClick={() => setOpen()}
            >
                <Icons.Search size={18} className="mr-2 shrink-0" />
                <span className="truncate">Find anything...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 border bg-accent px-1.5 font-mono text-[10px] font-medium opacity-100 md:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </Button>
        </SuperAdminGuard>
    );
}
