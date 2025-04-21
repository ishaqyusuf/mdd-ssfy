import { useMemo } from "react";
import { SheetFooter } from "@/components/ui/sheet";
import NumberFlow from "@number-flow/react";
import { CheckCircle, CheckIcon } from "lucide-react";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { Label } from "@gnd/ui/label";

import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useProduction } from "./production-tab";

export function ProductionTabFooter({}) {
    const { data, selections, setSelections } = useProduction();
    const ctx = useMemo(() => {
        const selectedUids = Object.entries(selections)
            .filter(([k, v]) => v)
            .map(([a, b]) => a);
        const selectCount = selectedUids.length;

        return {
            selectCount,
            selectedUids,
            allSelected: data.items.every((i) =>
                selectedUids.includes(i.controlUid),
            ),
        };
    }, [selections, data]);
    function toggleCheckState() {
        let newState = !ctx.allSelected;
        const newSelections = {};
        // data.items.filter(a => a.).map((item) =>
        //     newState ? (newSelections[item.controlUid] = true) : undefined,
        // );
        // console.log({ newState, newSelections });

        // setSelections(newState);
    }
    return (
        <CustomSheetContentPortal>
            <SheetFooter className="-m-4 -mb-2 border-t p-4 shadow-xl">
                <div className="flex flex-1 items-center gap-4">
                    <div className="inline-flex items-center gap-2">
                        <Checkbox
                            onCheckedChange={toggleCheckState}
                            checked={ctx.allSelected}
                            id="selectAll"
                        />
                        <Label className="" htmlFor="selectAll">
                            Mark All
                        </Label>
                    </div>
                    <div>
                        <NumberFlow
                            value={ctx.selectCount}
                            suffix="items selected"
                        />
                    </div>
                </div>
            </SheetFooter>
        </CustomSheetContentPortal>
    );
}
