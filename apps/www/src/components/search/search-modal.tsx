"use client";

import { useSearchStore } from "@/store/search";
import { Dialog, DialogContent } from "@gnd/ui/dialog";
import dynamic from "next/dynamic";
import { useHotkeys } from "react-hotkeys-hook";

const SearchModalContent = dynamic(() =>
    import("./search-modal-content").then((mod) => mod.SearchModalContent),
);

export function SearchModal() {
    const { isOpen, setOpen } = useSearchStore();

    useHotkeys("meta+k", () => setOpen(), {
        enableOnFormTags: true,
    });

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogContent
                className="m-0 h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-full overflow-hidden rounded-lg border-none bg-transparent p-0 select-text sm:h-[min(535px,calc(100dvh-2rem))] md:h-[535px] md:max-w-[740px]"
                hideClose
            >
                {isOpen ? <SearchModalContent /> : null}
            </DialogContent>
        </Dialog>
    );
}
