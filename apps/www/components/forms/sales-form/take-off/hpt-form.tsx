import { useState } from "react";
import { useTakeoffItem } from "./context";

import { ComponentHelperClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/step-component-class";
import { composeDoor } from "@/lib/sales/compose-door";
import { updateDoorGroupForm } from "@/lib/sales/update-door-form";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { Button } from "@gnd/ui/button";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { cn } from "@gnd/ui/cn";
import { Badge } from "@gnd/ui/badge";
import NumberFlow from "@number-flow/react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@gnd/ui/select";
import { NumberInput } from "@/components/currency-input";
import { AnimatedNumber } from "@/components/animated-number";
import { HptClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/hpt-class";
import { LineInput } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/line-input";
import {
    HptContextProvider,
    HptLineContextProvider,
    useHpt,
    useHptLine,
} from "../context";
import { PriceEstimateCell } from "../hpt/price-estimate-cell";
import { DoorSizeSelect } from "./door-size-select";
import { DoorSwingSelect } from "./door-swing-select";
import { DoorQtyInput } from "./door-qty-input";
import { WageInput } from "../hpt/wage-input";
import DevOnly from "@/_v2/components/common/dev-only";

export function HptForm({}) {
    const item = useTakeoffItem();
    const hptUid = [...item.stepSequence]?.reverse()?.[0];
    return (
        <HptContextProvider args={[hptUid]}>
            <HptLineProvider />
        </HptContextProvider>
    );
}
function HptLineProvider({}) {
    const hpt = useHpt();
    if (!hpt?.door?.sizePrice?.length) return null;
    const { itemForm } = hpt;
    const lineUid = itemForm?.groupItem?.itemIds?.[0];
    return (
        <HptLineContextProvider
            args={[
                {
                    lineUid,
                },
            ]}
        >
            <Content />
        </HptLineContextProvider>
    );
}
function Content() {
    const item = useTakeoffItem();
    const line = useHptLine();
    const { lineUid, sizeForm } = line;
    const ctx = useHpt();
    const { isSlab } = ctx;
    return (
        <div className="gap-2 flex justify-end">
            <DevOnly>
                <span>{item.itemUid}</span>
            </DevOnly>
            <table className="">
                <thead className="text-sm uppercase font-mono tracking-wider font-medium text-muted-foreground">
                    <tr className="text-xs">
                        <th className="p-1 px-2" align="left">
                            Size
                        </th>
                        {ctx.config.hasSwing && <th className="w-28">Swing</th>}
                        {!isSlab || <th className="w-16">PROD</th>}
                        {ctx.config.noHandle ? (
                            <th className="w-16 text-center" align="center">
                                <span className="">Qty</span>
                            </th>
                        ) : (
                            <>
                                <th className="w-16">Lh</th>
                                <th className="w-16">Rh</th>
                            </>
                        )}

                        <th className="p-1 px-2" align="right">
                            Estimate
                        </th>
                        <th className="p-1 px-2">Labor/Qty</th>
                        <th className="p-1 px-2">Line Total</th>
                        <th className="p-1 px-2"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <DoorSizeSelect />
                        </td>
                        {ctx.config.hasSwing && (
                            <td>
                                <DoorSwingSelect />
                            </td>
                        )}
                        {ctx.config.noHandle ? (
                            <>
                                <td>
                                    <DoorQtyInput name="total" suffix="QTY" />
                                </td>
                            </>
                        ) : (
                            <>
                                <td>
                                    <DoorQtyInput name="lh" suffix="LH" />
                                </td>
                                <td>
                                    <DoorQtyInput name="rh" suffix="RH" />
                                </td>
                            </>
                        )}
                        <td align="right">
                            <PriceEstimateCell />
                        </td>
                        <td align="right">
                            <WageInput />
                        </td>
                        <td
                            align="right"
                            className="text-sm font-mono font-semibold"
                        >
                            <AnimatedNumber
                                value={sizeForm?.pricing?.totalPrice || 0}
                            />
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
