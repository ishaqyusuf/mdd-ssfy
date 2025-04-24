import { SheetFooter } from "@gnd/ui/sheet";

import { CustomSheetContentPortal } from "../custom-sheet-content";

export function DispatchFooter({}) {
    return (
        <CustomSheetContentPortal>
            <SheetFooter className="-m-4 -mb-2 border-t p-4 shadow-xl"></SheetFooter>
        </CustomSheetContentPortal>
    );
}
