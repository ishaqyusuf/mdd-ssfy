import { SheetFooter } from "@gnd/ui/sheet";
import Sheet from "@gnd/ui/custom/sheet";

import { useDispatch } from "./context";

export function DispatchFooter({}) {
    const ctx = useDispatch();
    const { openForm, setOpenForm } = ctx;
    if (openForm) return null;
    return (
        <Sheet.Portal hideWhenSecondary>
            <SheetFooter className="-m-4 -mb-2 border-t p-4 shadow-xl"></SheetFooter>
        </Sheet.Portal>
    );
}
