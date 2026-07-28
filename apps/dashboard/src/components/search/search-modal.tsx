"use client";

import { useSearchStore } from "@/store/search";
import { Dialog, DialogContent } from "@gnd/ui/dialog";
import { useHotkeys } from "react-hotkeys-hook";
import { Search } from "./search";
import { SearchFooter } from "./search-footer";

export function SearchModal() {
    const { isOpen, setOpen } = useSearchStore();

    useHotkeys("meta+k", () => setOpen(), {
        enableOnFormTags: true,
    });

    return (
        <Dialog open={isOpen} onOpenChange={setOpen}>
            <DialogContent
                className="m-0 h-[535px] max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-full overflow-hidden border-none bg-transparent p-0 select-text sm:w-full md:max-w-[740px]"
                hideClose
            >
                {isOpen ? (
                    <>
                        <Search />
                        <SearchFooter />
                    </>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
