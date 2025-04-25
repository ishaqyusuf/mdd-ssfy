import { Button } from "@gnd/ui/button";
import { SheetFooter } from "@gnd/ui/sheet";

import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useDispatch } from "./context";

export function DispatchFormFooter({}) {
    const ctx = useDispatch();
    const { openForm, setOpenForm } = ctx;
    const onCancel = () => {
        setOpenForm(false);
    };
    if (!openForm) return null;
    return (
        <CustomSheetContentPortal>
            <SheetFooter className="-m-4 -mb-2 border-t p-4 shadow-xl">
                <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit">Create Dispatch</Button>
                </div>
            </SheetFooter>
        </CustomSheetContentPortal>
    );
}
