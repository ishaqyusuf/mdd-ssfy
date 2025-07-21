import { useMemo, useState } from "react";
import { Menu } from "@/components/(clean-code)/menu";
import NumberFlow from "@number-flow/react";
import { ActivityIcon, CheckCircle, CheckIcon } from "lucide-react";

import { Button } from "@gnd/ui/button";
import { Checkbox } from "@gnd/ui/checkbox";
import { cn } from "@gnd/ui/cn";
import { Label } from "@gnd/ui/label";
import { SheetFooter } from "@gnd/ui/sheet";

import { CustomSheetContentPortal } from "../custom-sheet-content";
import { useProduction } from "./context";
import { ProductionItemMenuActions } from "./production-item-menu";
import { useSalesOverviewQuery } from "@/hooks/use-sales-overview-query";

export function ProductionTabFooter({}) {
    const { data, selections, setSelections } = useProduction();
    const prodItems = data?.items?.filter(
        (item) => item?.itemConfig?.production,
    );
    const ctx = useMemo(() => {
        const selectedUids = Object.entries(selections)
            .filter(([k, v]) => v)
            .map(([a, b]) => a);
        const selectCount = selectedUids.length;

        return {
            selectCount,
            selectedUids,
            allSelected: prodItems?.every((i) =>
                selectedUids.includes(i.controlUid),
            ),
        };
    }, [selections, prodItems]);
    function toggleCheckState() {
        let newState = !ctx.allSelected;
        const newSelections = {};
        prodItems?.map((item) => (newSelections[item.controlUid] = newState));

        setSelections((current) => ({ ...newSelections }));
    }
    const query = useSalesOverviewQuery();
    const [opened, setOpened] = useState(false);
    if (query.dispatchMode) return null;
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
                    <div
                        className={cn(
                            !ctx.selectCount && "text-red-100 text-opacity-0",
                            "text-sm",
                        )}
                    >
                        <NumberFlow
                            value={ctx.selectCount}
                            suffix=" items selected"
                        />
                    </div>
                    <div className="flex-1"></div>
                    <Menu
                        noSize
                        open={opened}
                        onOpenChanged={setOpened}
                        label={"Action"}
                        Icon={ActivityIcon}
                    >
                        <ProductionItemMenuActions
                            itemUids={
                                ctx.selectCount ? ctx.selectedUids : undefined
                            }
                            setOpened={setOpened}
                        />
                    </Menu>
                </div>
            </SheetFooter>
        </CustomSheetContentPortal>
    );
}
