import { SheetFooter } from "@gnd/ui/sheet";

import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useDispatch } from "./context";

export function DispatchFooter({}) {
    const ctx = useDispatch();
    const { openForm, setOpenForm } = ctx;
    if (openForm) return null;
    return (
        <CustomSheetContentPortal>
            <SheetFooter className="-m-4 -mb-2 border-t p-4 shadow-xl"></SheetFooter>
        </CustomSheetContentPortal>
    );
}
